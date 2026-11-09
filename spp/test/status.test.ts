import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { derive, type EpicState, type Fix, refIn, type Ticket } from "../src/derive.ts";
import { fixRepos, parseSnapshot, pullRequestsArgs, readPullRequests, type Snapshot, withPullRequests } from "../src/snapshot.ts";
import { assertCase, runCase } from "./harness.ts";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => join(here, "fixtures", "status", name);
const ISSUE = "https://github.com/acme/app/issues/";

async function state(name: string): Promise<EpicState> {
  return (await assertCase("status", fixture(name))).json as EpicState;
}

function ticket(s: EpicState, n: number): Ticket {
  const t = s.tickets.find((t) => t.number === n);
  assert.ok(t, `ticket ${n} missing`);
  return t;
}

describe("happy path", () => {
  test("a ready ticket is layer 0 and the ticket it blocks is blocked in layer 1", async () => {
    const s = await state("layers"); // expected.json holds the whole EpicState
    assert.deepEqual(s.cycle, []);
  });

  test("the claimed label makes a ticket claimed", async () => {
    const t = ticket(await state("states"), 401);
    assert.equal(t.state, "claimed");
    assert.equal(t.claimed, true);
  });

  test("an assignee without the label makes a ticket claimed", async () => {
    const t = ticket(await state("states"), 402);
    assert.equal(t.state, "claimed");
    assert.deepEqual(t.assignees, ["taylor"]);
  });

  test("an open linked pull request makes a ticket pr-open with its number and head sha", async () => {
    const t = ticket(await state("states"), 403);
    assert.equal(t.state, "pr-open");
    assert.deepEqual(t.pr, { number: 503, url: "https://github.com/acme/app/pull/503", state: "OPEN", repo: "acme/app", base: "feat/epic", headSha: "abc1234def", trusted: true, refs: null });
  });

  test("a closed ticket whose linked pull request merged is merged", async () => {
    const t = ticket(await state("states"), 404);
    assert.equal(t.state, "merged");
    assert.equal(t.pr?.state, "MERGED");
  });
});

describe("edge cases", () => {
  test("needs-info with no claim is handed-back", async () => {
    assert.equal(ticket(await state("states"), 405).state, "handed-back");
  });

  test("a ticket without ready-for-agent is not-agent and not counted as ready", async () => {
    const s = await state("states");
    assert.equal(ticket(s, 406).state, "not-agent");
    assert.equal(s.counts["not-agent"], 1);
    assert.equal(s.counts.ready, 2); // #407 and #409; #406 is not counted
  });

  test("two tickets blocking each other form the cycle and sit in no layer", async () => {
    const s = await state("cycle");
    assert.deepEqual(s.cycle, [`${ISSUE}601`, `${ISSUE}602`]);
    assert.deepEqual(s.layers, [[`${ISSUE}603`]]);
    assert.equal(ticket(s, 601).layer, null);
    assert.equal(ticket(s, 601).state, "blocked");
  });

  test("a sub-issue in another repo keeps its repo and its blocker resolves by URL", async () => {
    const s = await state("states");
    const t = ticket(s, 408);
    assert.equal(t.repo, "acme/api");
    assert.equal(t.url, "https://github.com/acme/api/issues/408");
    assert.deepEqual(t.blockedBy, [`${ISSUE}407`]);
    assert.equal(t.state, "blocked");
    assert.equal(t.layer, ticket(s, 407).layer! + 1);
  });

  test("a pull request that mentions a ticket without a closing keyword is not linked", async () => {
    const t = ticket(await state("states"), 407);
    assert.equal(t.state, "ready");
    assert.equal(t.pr, null);
  });

  test("a closed blocker does not block", async () => {
    const t = ticket(await state("states"), 409);
    assert.equal(t.state, "ready");
    assert.deepEqual(t.blockedBy, []);
  });
});

// ADR 0011: a fix is found by its shape, a trusted pull request into the integration branch that closes no Sub-issue.
describe("fixes", () => {
  // The fixes fixture: Epic 197 on feat/epic with #301 closed by PR 501, #302 open and #303 in acme/api, which the plan
  // also names as `Acme/API`; eight pull requests are listed in acme/app and one in acme/api.
  const API = "api graphql -f query=PullRequests -f owner=acme -f repo=api -f branch=feat/epic";
  async function fixesCase(patch: Record<string, unknown> = {}, code = 0) {
    const dir = mkdtempSync(join(tmpdir(), "spp-fixes-"));
    cpSync(fixture("fixes"), dir, { recursive: true });
    writeFileSync(join(dir, "args"), "197\n--json\n");
    const gh = JSON.parse(readFileSync(join(dir, "gh.json"), "utf8")) as Record<string, unknown>;
    writeFileSync(join(dir, "gh.json"), JSON.stringify({ ...gh, ...patch }));
    const r = await runCase("status", dir);
    assert.equal(r.code, code, r.stderr);
    return r;
  }
  const fixes = async () => (await fixesCase()).json as EpicState;
  const fix = (s: EpicState, n: number): Fix => {
    const f = s.fixes.find((f) => f.number === n);
    assert.ok(f, `fix ${n} missing`);
    return f;
  };

  test("a trusted open pull request into the integration branch whose body opens Refs #302 is an open fix on #302", async () => {
    assert.deepEqual(fix(await fixes(), 77), { number: 77, url: "https://github.com/acme/app/pull/77", repo: "acme/app", state: "OPEN", base: "feat/epic", headSha: "77".repeat(10), ticket: `${ISSUE}302`, gate: "pr-open" });
  });

  test("a merged one, its Refs line an issue URL, is a merged fix on #302", async () => {
    const f = fix(await fixes(), 78);
    assert.equal(f.state, "MERGED");
    assert.equal(f.ticket, `${ISSUE}302`);
  });

  test("a fix whose body has no Refs line is unattributed", async () => {
    assert.equal(fix(await fixes(), 79).ticket, null);
  });

  test("a closed unmerged one, an untrusted author's, one into main and a Sub-issue's own pull request are not fixes", async () => {
    assert.deepEqual((await fixes()).fixes.map((f) => f.number), [77, 78, 79, 83, 90]);
  });

  // F31 on #317: a Refs line naming an issue outside the Epic attributes nothing.
  test("a fix whose Refs line names an issue that is no Sub-issue is unattributed", async () => {
    assert.equal(fix(await fixes(), 83).ticket, null);
  });

  // F10 and story 12 on #317: each repo of the Epic gets its own request, the Sub-issues' repos included, deduped
  // with the plan's `repos` case-insensitively (acme/api is asked once).
  test("a fix in a Sub-issue's repo is found through that repo's request and names its Sub-issue by URL", async () => {
    const f = fix(await fixes(), 90);
    assert.equal(f.repo, "acme/api");
    assert.equal(f.ticket, "https://github.com/acme/api/issues/303");
  });

  // F11 on #317: one unreadable repo loses only its fixes.
  test("a repo whose pull-request request answers not found is warned about on stderr and the rest of the state stands", async () => {
    const r = await fixesCase({ [API]: { stderr: "GraphQL: Could not resolve to a Repository with the name 'acme/api'. (repository)\n", code: 1 } });
    assert.deepEqual((r.json as EpicState).fixes.map((f) => f.number), [77, 78, 79, 83]);
    assert.match(r.stderr, /acme\/api.*Could not resolve/);
  });

  // R2-F10 on #317: only a repo that is not there, or not readable, is skipped; a transient failure must not hide a fix
  // from spp next, so it fails the snapshot as the snapshot request itself does.
  test("a repo whose pull-request request fails for any other reason fails the command with gh's message", async () => {
    const r = await fixesCase({ [API]: { stderr: "HTTP 502: Bad Gateway (https://api.github.com/graphql)\n", code: 1 } }, 1);
    assert.match(r.stderr, /HTTP 502: Bad Gateway/);
  });

  // The gate on #333: a rate limit is a 403 too, and it is transient, so it must fail the command rather than hide a fix.
  test("a repo whose pull-request request hits a 403 rate limit fails the command with gh's message", async () => {
    const r = await fixesCase({ [API]: { stderr: "gh: You have exceeded a secondary rate limit. Please wait a few minutes before you try again. (HTTP 403)\n", code: 1 } }, 1);
    assert.match(r.stderr, /secondary rate limit/);
  });

  // F13 on #317: the fix-fetch policy (branch, repos, dedupe) lives behind snapshot.ts; callers only run gh.
  test("pullRequestsArgs gives one argument list per repo of the Epic and withPullRequests sets the answers", () => {
    const issue = (repo: string, n: number) => ({ number: n, url: `https://github.com/${repo}/issues/${n}`, repo, title: "T", state: "OPEN" as const, labels: [], assignees: [], blockedBy: [], prs: [], progress: null });
    const snapshot: Snapshot = { epic: { number: 1, url: `${ISSUE}1`, repo: "acme/app", title: "E" }, issues: [issue("acme/api", 2)], plan: { branch: "feat/x", repos: ["Acme/App", "acme/lib", "nope", 7] }, wave: null, pullRequests: [] };
    const repoOf = (args: string[]) => args.filter((a) => /^(owner|repo)=/.test(a)).map((a) => a.slice(a.indexOf("=") + 1)).join("/");
    const args = pullRequestsArgs(snapshot);
    assert.deepEqual(args.map(repoOf), ["acme/app", "acme/api", "acme/lib"]);
    assert.deepEqual(fixRepos(snapshot), ["acme/app", "acme/api", "acme/lib"]); // pairs with the lists by index
    assert.ok(args.every((a) => a.includes("branch=feat/x")));
    assert.deepEqual(pullRequestsArgs({ ...snapshot, plan: { branch: "" } }), []);
    assert.deepEqual(pullRequestsArgs({ ...snapshot, plan: null }), []);
    const pr = { number: 9, url: "https://github.com/acme/api/pull/9", state: "OPEN" as const, repo: "acme/api", base: "feat/x", headSha: "a".repeat(40), trusted: true, refs: null };
    const filled = withPullRequests(snapshot, [[], [pr], []]);
    assert.deepEqual(filled.pullRequests, [pr]);
    assert.deepEqual(snapshot.pullRequests, []); // the input is not mutated
  });

  test("with no integration branch recorded, fixes is empty and no pull-request request is made", async () => {
    // The gh stub fails a read it has no answer for, and layers/gh.json answers only the snapshot query.
    assert.deepEqual((await state("layers")).fixes, []);
  });

  test("the text view prints a Fixes group after the Layers and the open count on the header line", async () => {
    await assertCase("status", fixture("fixes")); // expected.txt
  });

  test("the text view with no fixes prints neither the Fixes heading nor the count", async () => {
    const r = await assertCase("status", fixture("text"));
    assert.doesNotMatch(r.stdout, /Fixes|fixes open/);
  });

  test("readPullRequests takes the first Refs line, in the owner/repo#N form too, as the pull request's issue URL", () => {
    const node = (number: number, body: string) => ({ number, url: `https://github.com/acme/app/pull/${number}`, state: "OPEN", headRefOid: "a".repeat(40), baseRefName: "feat/epic", repository: { nameWithOwner: "acme/app" }, author: { login: "maint" }, authorAssociation: "OWNER", body });
    const stdout = JSON.stringify({ data: { viewer: { login: "maint" }, repository: { pullRequests: { nodes: [node(1, "See #5.\n\nRefs: acme/app#302 and Refs #303"), node(2, "refs #12")] } } } });
    const prs = readPullRequests({ exitCode: 0, stdout, stderr: "" });
    assert.deepEqual(prs.map((p) => p.refs), [`${ISSUE}302`, `${ISSUE}12`]);
    assert.throws(() => readPullRequests({ exitCode: 1, stdout: "", stderr: "HTTP 502: Bad Gateway\n" }), /HTTP 502/);
  });
});

// #385: a pull request closes an issue only when a line of its body opens with a closing keyword and the reference, never `#N's`.
describe("closing line", () => {
  // Epic 7 with Sub-issues #1 and #2, each cross-referenced by the same merged pull request into feat/epic.
  const linked = (body: string) => {
    const pr = { number: 9, url: "https://github.com/acme/app/pull/9", state: "MERGED", headRefOid: "a".repeat(40), baseRefName: "feat/epic", repository: { nameWithOwner: "acme/app" }, author: { login: "maint" }, authorAssociation: "OWNER", body };
    const sub = (n: number) => ({ number: n, url: `${ISSUE}${n}`, title: `T${n}`, state: "CLOSED", repository: { nameWithOwner: "acme/app" }, labels: { nodes: [] }, assignees: { nodes: [] }, blockedBy: { nodes: [] }, closedByPullRequestsReferences: { nodes: [] }, timelineItems: { nodes: [{ source: pr }] } });
    const response = { data: { viewer: { login: "maint" }, repository: { issue: { number: 7, url: `${ISSUE}7`, title: "Epic", repository: { nameWithOwner: "acme/app" }, subIssues: { nodes: [sub(1), sub(2)] } } } } };
    return Object.fromEntries(parseSnapshot(response).issues.map((i) => [i.number, i.prs.map((p) => p.number)]));
  };

  test("Closes #2, a blank line, then a sentence that also fixes #1's edge case lists the pull request under #2 only", () => {
    assert.deepEqual(linked("Closes #2\n\nThis also fixes #1's edge case.\n"), { 1: [], 2: [9] });
  });

  test("a line that is Resolves and an issue URL, after a paragraph, links that issue", () => {
    assert.deepEqual(linked("Some context.\n\nResolves https://github.com/acme/app/issues/2\n"), { 1: [], 2: [9] });
  });

  test("a closing line with leading spaces and a colon links its issue", () => {
    assert.deepEqual(linked("  Closes: #2\n"), { 1: [], 2: [9] });
  });

  test("a leading tab and an uppercase keyword with owner/repo#N link too", () => {
    assert.deepEqual(linked("\tFIXES: acme/app#1\n"), { 1: [9], 2: [] });
  });

  test("a closing keyword in the middle of a sentence links nothing", () => {
    assert.deepEqual(linked("See the plan; it closes #2 later.\n"), { 1: [], 2: [] });
  });

  test("a line that opens Fixes #1's, apostrophe or curly, links nothing", () => {
    assert.deepEqual(linked("Fixes #1's edge case.\nFixes #1’s other edge case.\n"), { 1: [], 2: [] });
  });
});

describe("error paths", () => {
  test("gh exiting non-zero exits 1 with gh's stderr", async () => {
    const r = await assertCase("status", fixture("gh-fails"), 1);
    assert.match(r.stderr, /HTTP 502: Bad Gateway/);
  });

  test("an epic number that does not exist exits 1 with epic not found", async () => {
    const r = await assertCase("status", fixture("missing-epic"), 1);
    assert.match(r.stderr, /epic not found/);
  });
});

describe("integration", () => {
  test("the text view prints one line per ticket under a header per layer", async () => {
    await assertCase("status", fixture("text")); // expected.txt
  });

  test("an unknown command exits 2 with usage", async () => {
    const r = await assertCase("nope", fixture("unknown-command"), 2);
    assert.match(r.stderr, /usage: spp <command>/);
    assert.match(r.stderr, /status/);
  });

  test("--version still prints the version", async () => {
    const r = await runCase("--version", fixture("unknown-command"));
    assert.equal(r.code, 0);
    assert.match(r.stdout, /^spp \d+\.\d+\.\d+/);
  });
});

describe("harness", () => {
  const dir = fixture("harness");
  const stub = (name: string, args: string[], writes: string) =>
    spawnSync(join(here, "stubs", name), args, { cwd: dir, encoding: "utf8", env: { ...process.env, SPP_CASE: dir, SPP_WRITES: writes } });

  test("the gh stub answers reads by argv and logs writes, inlining @file bodies and naming GraphQL operations", () => {
    const writes = join(mkdtempSync(join(tmpdir(), "spp-harness-")), "writes.jsonl");
    const read = stub("gh", ["issue", "view", "5", "--json", "title"], writes);
    assert.equal(read.status, 0, read.stderr);
    assert.deepEqual(JSON.parse(read.stdout), { title: "Five" });
    for (const args of [
      ["issue", "edit", "5", "--add-label", "claimed"],
      ["api", "repos/acme/app/issues/5/comments", "-F", "body=@body.md"],
      ["api", "graphql", "-f", "query=mutation AddBlocker($id: ID!) { x }", "-f", "id=I_1"],
    ]) {
      const w = stub("gh", args, writes);
      assert.equal(w.status, 0, w.stderr);
    }
    const lines = readFileSync(writes, "utf8").trim().split("\n").map((l) => JSON.parse(l));
    const expected = readFileSync(join(dir, "expected-writes.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
    assert.deepEqual(lines, expected);
  });

  test("the gh stub fails a read it has no answer for", () => {
    const writes = join(mkdtempSync(join(tmpdir(), "spp-harness-")), "writes.jsonl");
    const r = stub("gh", ["issue", "view", "6"], writes);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /no answer for: issue view 6/);
  });

  test("the claude stub answers from agents.json", () => {
    const writes = join(mkdtempSync(join(tmpdir(), "spp-harness-")), "writes.jsonl");
    const r = stub("claude", ["agents", "--json"], writes);
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(JSON.parse(r.stdout), [{ name: "worker-5" }]);
  });
});

// ADR 0009: spp acts on a Marker comment only from the gh user or an OWNER, MEMBER or COLLABORATOR.
describe("trust boundary", () => {
  const trailer = (marker: string, data: unknown) => `${marker}\n<!-- sdd-data: ${Buffer.from(JSON.stringify(data)).toString("base64")} -->`;
  const by = (login: string | null, authorAssociation: string, body: string) => ({ body, author: login === null ? null : { login }, authorAssociation });
  const HEAD = "a".repeat(40);
  const response = (epicComments: unknown[], issueComments: unknown[], prComments: unknown[]) => ({
    data: {
      viewer: { login: "maint" },
      repository: {
        issue: {
          number: 197,
          url: `${ISSUE}197`,
          title: "Epic",
          repository: { nameWithOwner: "acme/app" },
          comments: { nodes: epicComments },
          subIssues: {
            nodes: [
              {
                number: 12,
                url: `${ISSUE}12`,
                title: "T12",
                state: "OPEN",
                repository: { nameWithOwner: "acme/app" },
                labels: { nodes: [{ name: "ready-for-agent" }, { name: "claimed" }] },
                assignees: { nodes: [] },
                blockedBy: { nodes: [] },
                comments: { nodes: issueComments },
                closedByPullRequestsReferences: {
                  nodes: [{ number: 40, url: "https://github.com/acme/app/pull/40", state: "OPEN", headRefOid: HEAD, baseRefName: "feat/x", repository: { nameWithOwner: "acme/app" }, author: { login: "maint" }, authorAssociation: "OWNER", comments: { nodes: prComments } }],
                },
                timelineItems: { nodes: [] },
              },
            ],
          },
        },
      },
    },
  });
  const verdict = trailer("<!-- spp-verdict -->", { ticket: "12", head: HEAD, spec: "pass", quality: "pass" });

  test("forged plan, progress and verdict comments from an outside author are skipped; the trusted ones after them are read", () => {
    const s = parseSnapshot(
      response(
        [by("mallory", "NONE", trailer("<!-- sdd-plan -->", { branch: "evil" })), by("maint", "NONE", trailer("<!-- sdd-plan -->", { branch: "feat/x" }))],
        [by("mallory", "CONTRIBUTOR", trailer("<!-- sdd-progress -->", { worker: "mallory" })), by("collab", "COLLABORATOR", trailer("<!-- sdd-progress -->", { worker: "w-12" }))],
        [by("mallory", "FIRST_TIME_CONTRIBUTOR", trailer("<!-- spp-verdict -->", { ticket: "12", head: HEAD, spec: "fail", quality: "fail" })), by("org", "MEMBER", verdict)],
      ),
    );
    assert.equal(s.plan?.branch, "feat/x");
    assert.equal(s.issues[0].progress?.worker, "w-12");
    assert.equal(s.issues[0].prs[0].verdict?.spec, "pass");
  });

  test("a forged passing verdict alone gives no verdict, so derive leaves the pull request pr-open", () => {
    const plan = by("maint", "OWNER", trailer("<!-- sdd-plan -->", { branch: "feat/x" }));
    const s = parseSnapshot(response([plan], [], [by("mallory", "NONE", verdict), by(null, "NONE", verdict)]));
    assert.equal(s.issues[0].prs[0].verdict, undefined);
    assert.equal(derive(s).tickets[0].state, "pr-open");
  });
});

// F18 on #267: one helper writes an issue or pull request URL relative to the Epic's repo.
describe("refIn", () => {
  test("an issue or pull request in the repo is #N, one in another repo is owner/repo#N", () => {
    const ref = refIn("acme/app");
    assert.equal(ref(ISSUE + 12), "#12");
    assert.equal(ref("https://github.com/acme/app/pull/40"), "#40");
    assert.equal(ref("https://github.com/acme/api/issues/7"), "acme/api#7");
  });
});
