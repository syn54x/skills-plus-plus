import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { runCase } from "./harness.ts";

const ISSUE = "https://github.com/acme/app/issues/";
const SNAPSHOT = "api graphql -f query=Snapshot -F owner={owner} -F repo={repo} -F number=197";
const progress = `<!-- sdd-progress -->\n<!-- sdd-data: ${Buffer.from(JSON.stringify({ worker: "t-12" })).toString("base64")} -->`;

// Epic 197's snapshot with ticket 12, claimed by t-12, and an open pull request when `pr` is set.
const snapshot = (pr: boolean) => ({
  stdout: {
    data: {
      repository: {
        issue: {
          number: 197,
          url: ISSUE + 197,
          title: "Epic",
          repository: { nameWithOwner: "acme/app" },
          comments: { nodes: [] },
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
                  nodes: pr ? [{ number: 40, url: "https://github.com/acme/app/pull/40", state: "OPEN", headRefOid: "a".repeat(40), repository: { nameWithOwner: "acme/app" } }] : [],
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

const session = (state: string) => ({ stdout: [{ name: "t-12", kind: "background", state }, { name: "other", kind: "background", state: "done" }] });

// `snapshots` and `sessions` are served one per poll, the last repeating.
function scratch(snapshots: unknown[], sessions: unknown[]): string {
  const dir = mkdtempSync(join(tmpdir(), "spp-wait-"));
  writeFileSync(join(dir, "gh.json"), JSON.stringify({ [SNAPSHOT]: snapshots }));
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
