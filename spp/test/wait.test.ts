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

// Epic 197's snapshot with ticket 12, claimed by t-12 (or, with `assignee`, held by that person and unclaimed), and
// a pull request into the integration branch when `pr` is set: open for true, else in the state it names.
const snapshot = (pr: boolean | "MERGED", assignee?: string) => ({
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
                labels: { nodes: assignee ? [{ name: "ready-for-agent" }] : [{ name: "ready-for-agent" }, { name: "claimed" }] },
                assignees: { nodes: assignee ? [{ login: assignee }] : [] },
                blockedBy: { nodes: [] },
                comments: { nodes: [{ body: progress, author: { login: "maint" }, authorAssociation: "OWNER" }] },
                closedByPullRequestsReferences: {
                  nodes: pr ? [{ number: 40, url: "https://github.com/acme/app/pull/40", state: pr === true ? "OPEN" : pr, headRefOid: "a".repeat(40), baseRefName: "feat/epic", repository: { nameWithOwner: "acme/app" }, author: { login: "maint" }, authorAssociation: "OWNER" }] : [],
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

// The integration branch's pull-request list: one fix pull request in `state`, or none.
const fixes = (state?: string) => ({
  stdout: { data: { repository: { pullRequests: { nodes: state ? [{ number: 77, url: "https://github.com/acme/app/pull/77", state, headRefOid: "b".repeat(40), baseRefName: "feat/epic", repository: { nameWithOwner: "acme/app" }, author: { login: "maint" }, authorAssociation: "OWNER", body: "Refs #12" }] : [] } } } },
});

const session = (state: string) => ({ stdout: [{ name: "t-12", kind: "background", state }, { name: "other", kind: "background", state: "done" }] });

// `snapshots`, `pullRequests` and `sessions` are served one per poll, the last repeating.
function scratch(snapshots: unknown[], sessions: unknown[], pullRequests: unknown[] = [fixes()]): string {
  const dir = mkdtempSync(join(tmpdir(), "spp-wait-"));
  writeFileSync(join(dir, "gh.json"), JSON.stringify({ [SNAPSHOT]: snapshots, [PULL_REQUESTS]: pullRequests }));
  writeFileSync(join(dir, "agents.json"), JSON.stringify({ "agents --json --all": sessions }));
  writeFileSync(join(dir, "args"), "197\n--interval\n0\n");
  return dir;
}

describe("happy path", () => {
  test("spp wait 197 where t-12 goes from working to done on the second poll exits 0 printing t-12 done", async () => {
    const r = await runCase("wait", scratch([snapshot(false)], [session("working"), session("done")]));
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stdout, "t-12 done\n");
    assert.deepEqual(r.writes, []);
  });

  test("a ticket's state change exits 0 printing the old and new state", async () => {
    const r = await runCase("wait", scratch([snapshot(false), snapshot(false), snapshot(true)], [session("working")]));
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stdout, "#12 claimed -> pr-open\n");
  });

  test("a fix pull request open on the first poll and merged on the second exits 0 printing OPEN -> MERGED", async () => {
    const dir = scratch([snapshot(false)], [session("working")], [fixes("OPEN"), fixes("MERGED")]);
    writeFileSync(join(dir, "args"), "197\n--interval\n0\n--timeout\n5\n");
    const r = await runCase("wait", dir);
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stdout, "#77 OPEN -> MERGED\n");
  });
});

// F7 on #267: wait wakes the orchestrator even when nothing changes between its polls.
describe("edge cases", () => {
  test("a claimed ticket whose worker had already stopped before the wait began is reported on the first poll", async () => {
    const dir = scratch([snapshot(false)], [session("done")]);
    writeFileSync(join(dir, "args"), "197\n--interval\n0\n--timeout\n60\n");
    const r = await runCase("wait", dir);
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stdout, "t-12 done\n");
  });

  test("a worker that stopped after opening its pull request is not reported, so the wait does not wake at once", async () => {
    const dir = scratch([snapshot(true)], [session("done")]);
    writeFileSync(join(dir, "args"), "197\n--interval\n0\n--timeout\n0\n");
    const r = await runCase("wait", dir);
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stdout, "heartbeat: nothing changed in 0s\n");
  });

  // F25 (Round 2) on #267: a landed ticket's finished worker is no lost worker, so wait and next agree.
  test("a claimed ticket whose pull request merged while its issue stays open, its worker done, is not reported", async () => {
    const dir = scratch([snapshot("MERGED")], [session("done")]);
    writeFileSync(join(dir, "args"), "197\n--interval\n0\n--timeout\n0\n");
    const r = await runCase("wait", dir);
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stdout, "heartbeat: nothing changed in 0s\n");
  });

  test("a ticket a person holds by assignment, with a stale t-<N> session listed, is not reported", async () => {
    const dir = scratch([snapshot(false, "alice")], [session("done")]);
    writeFileSync(join(dir, "args"), "197\n--interval\n0\n--timeout\n0\n");
    const r = await runCase("wait", dir);
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stdout, "heartbeat: nothing changed in 0s\n");
  });

  test("nothing changing until the timeout exits 0 with one heartbeat line", async () => {
    const dir = scratch([snapshot(false)], [session("working")]);
    writeFileSync(join(dir, "args"), "197\n--interval\n0\n--timeout\n0\n");
    const r = await runCase("wait", dir);
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stdout, "heartbeat: nothing changed in 0s\n");
  });
});

describe("error paths", () => {
  test("a negative interval exits 2 with usage", async () => {
    const dir = scratch([snapshot(false)], [session("working")]);
    writeFileSync(join(dir, "args"), "197\n--interval\n-1\n");
    const r = await runCase("wait", dir);
    assert.equal(r.code, 2);
    assert.match(r.stderr, /usage: spp wait/);
  });
});
