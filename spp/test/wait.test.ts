import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { runCase } from "./harness.ts";

const ISSUE = "https://github.com/acme/app/issues/";
const SNAPSHOT = "api graphql -f query=Snapshot -F owner={owner} -F repo={repo} -F number=197";
const PULL_REQUESTS = "api graphql -f query=PullRequests -f owner=acme -f repo=app -f branch=feat/epic";
const progress = `<!-- sdd-progress -->\n<!-- sdd-data: ${Buffer.from(JSON.stringify({ worker: "t-12" })).toString("base64")} -->`;
const plan = `<!-- sdd-plan -->\n<!-- sdd-data: ${Buffer.from(JSON.stringify({ branch: "feat/epic" })).toString("base64")} -->`;

// Epic 197's snapshot with ticket 12, claimed by t-12, and a pull request into the integration branch when `pr` is set.
const snapshot = (pr: boolean) => ({
  stdout: {
    data: {
      repository: {
        issue: {
          number: 197,
          url: ISSUE + 197,
          title: "Epic",
          repository: { nameWithOwner: "acme/app" },
          comments: { nodes: [{ body: plan, author: { login: "maint" }, authorAssociation: "OWNER" }] },
          subIssues: {
            nodes: [
              {
                number: 12,
                url: ISSUE + 12,
                title: "Ticket 12",
                state: "OPEN",
                repository: { nameWithOwner: "acme/app" },
                labels: { nodes: [{ name: "ready-for-agent" }, { name: "claimed" }] },
                assignees: { nodes: [] },
                blockedBy: { nodes: [] },
                comments: { nodes: [{ body: progress, author: { login: "maint" }, authorAssociation: "OWNER" }] },
                closedByPullRequestsReferences: {
                  nodes: pr ? [{ number: 40, url: "https://github.com/acme/app/pull/40", state: "OPEN", headRefOid: "a".repeat(40), baseRefName: "feat/epic", repository: { nameWithOwner: "acme/app" }, author: { login: "maint" }, authorAssociation: "OWNER" }] : [],
                },
                timelineItems: { nodes: [] },
              },
            ],
          },
        },
      },
    },
  },
});

// The integration branch's pull-request list: one fix pull request in `state` at `head`, with the gate's passing
// verdict on that head when `verdict` is set, or none.
const fixes = (state?: string, head = "b".repeat(40), verdict = false) => {
  const trailer = `<!-- spp-verdict -->\n<!-- sdd-data: ${Buffer.from(JSON.stringify({ ticket: "12", head, spec: "pass", quality: "pass" })).toString("base64")} -->`;
  const comments = { nodes: verdict ? [{ body: trailer, author: { login: "maint" }, authorAssociation: "OWNER" }] : [] };
  return {
    stdout: { data: { repository: { pullRequests: { nodes: state ? [{ number: 77, url: "https://github.com/acme/app/pull/77", state, headRefOid: head, baseRefName: "feat/epic", repository: { nameWithOwner: "acme/app" }, author: { login: "maint" }, authorAssociation: "OWNER", body: "Refs #12", comments }] : [] } } } },
  };
};

// `snapshots` and `pullRequests` are served one per poll, the last repeating. No claude answer is stubbed: spp wait
// reads no session list, and the claude stub logs any call it gets as a write.
function scratch(snapshots: unknown[], pullRequests: unknown[] = [fixes()]): string {
  const dir = mkdtempSync(join(tmpdir(), "spp-wait-"));
  writeFileSync(join(dir, "gh.json"), JSON.stringify({ [SNAPSHOT]: snapshots, [PULL_REQUESTS]: pullRequests }));
  writeFileSync(join(dir, "args"), "197\n--interval\n0\n");
  return dir;
}

describe("happy path", () => {
  test("spp wait 197 while #12 moves from claimed to pr-open exits 0 printing #12 claimed -> pr-open", async () => {
    const r = await runCase("wait", scratch([snapshot(false), snapshot(false), snapshot(true)]));
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stdout, "#12 claimed -> pr-open\n");
    assert.deepEqual(r.writes, [], "no claude call");
  });

  test("a fix pull request open on the first poll and merged on the second exits 0 printing OPEN -> MERGED", async () => {
    const dir = scratch([snapshot(false)], [fixes("OPEN"), fixes("MERGED")]);
    writeFileSync(join(dir, "args"), "197\n--interval\n0\n--timeout\n5\n");
    const r = await runCase("wait", dir);
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stdout, "#77 OPEN -> MERGED\n");
  });

  // Story 13 on #317: a fix round pushes a new head, and the gate's verdict then lands on it; both wake the wait.
  test("a fix pull request whose head moved between polls exits 0 printing OPEN -> OPEN (new head)", async () => {
    const dir = scratch([snapshot(false)], [fixes("OPEN"), fixes("OPEN", "c".repeat(40))]);
    writeFileSync(join(dir, "args"), "197\n--interval\n0\n--timeout\n5\n");
    const r = await runCase("wait", dir);
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stdout, "#77 OPEN -> OPEN (new head)\n");
  });

  // R2-F8 on #317: the gate's verdict landing on the fix's current head wakes the wait too.
  test("a fix pull request that gets a passing verdict on its head between polls exits 0 printing OPEN -> OPEN (gate-pass)", async () => {
    const dir = scratch([snapshot(false)], [fixes("OPEN"), fixes("OPEN", "b".repeat(40), true)]);
    writeFileSync(join(dir, "args"), "197\n--interval\n0\n--timeout\n5\n");
    const r = await runCase("wait", dir);
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stdout, "#77 OPEN -> OPEN (gate-pass)\n");
  });
});

// F7 on #267: wait wakes the orchestrator even when nothing changes between its polls.
describe("edge cases", () => {
  test("nothing changing until the timeout exits 0 with one heartbeat line", async () => {
    const dir = scratch([snapshot(false)]);
    writeFileSync(join(dir, "args"), "197\n--interval\n0\n--timeout\n0\n");
    const r = await runCase("wait", dir);
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stdout, "heartbeat: nothing changed in 0s\n");
  });

  // #408: a claimed ticket with no pull request is no stopped worker to wait reports; spp next --resume asks about it.
  test("a claimed ticket with no pull request and nothing changing exits on the heartbeat, never with a t-<N> done line", async () => {
    const dir = scratch([snapshot(false)]);
    writeFileSync(join(dir, "args"), "197\n--interval\n0\n--timeout\n0\n");
    const r = await runCase("wait", dir);
    assert.equal(r.code, 0, r.stderr);
    assert.doesNotMatch(r.stdout, /t-\d+ done/);
    assert.equal(r.stdout, "heartbeat: nothing changed in 0s\n");
    assert.deepEqual(r.writes, [], "no claude call");
  });
});

describe("error paths", () => {
  test("a negative interval exits 2 with usage", async () => {
    const dir = scratch([snapshot(false)]);
    writeFileSync(join(dir, "args"), "197\n--interval\n-1\n");
    const r = await runCase("wait", dir);
    assert.equal(r.code, 2);
    assert.match(r.stderr, /usage: spp wait/);
  });
});
