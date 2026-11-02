import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { runCase } from "./harness.ts";
import { git, gitRepo, runSpp, tempDir } from "./fixtures/verify/git.ts";

const here = dirname(fileURLToPath(import.meta.url));
const ghJson = (name: string) => readFileSync(join(here, "fixtures", "verify", name, "gh.json"), "utf8");
const noteOnHead = (repo: string) => git(repo, "notes", "--ref=sdd-verify", "show", "HEAD");

// A case directory that is also a git repository on `branch`, its gh answers and args committed.
const repoCase = (args: string[], fixture = "pass", branch = "main") =>
  gitRepo(branch, { "gh.json": ghJson(fixture), args: args.join("\n") + "\n" });

describe("happy path", () => {
  test("spp verify 12 whose Verify is `true` prints pass and writes a verified note on HEAD", async () => {
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

  test("spp verify with no ticket exits 2 with usage", () => {
    const r = runSpp(["verify"], "", gitRepo());
    assert.equal(r.code, 2);
    assert.match(r.stderr, /usage: spp verify/);
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
