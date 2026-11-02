import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { readTrailer } from "../src/markers.ts";
import { runCase } from "./harness.ts";

// One Epic, acme/app#197 on integration branch feat/x: ticket #30 (pull request #40) and ticket #31 (pull request #41),
// which #30 blocks. Both pull requests carry a passing verdict on their head unless a case says otherwise.
const REPO = "https://github.com/acme/app";
const HEAD = { 40: "4".repeat(40), 41: "5".repeat(40) } as Record<number, string>;
const TICKET = { 40: 30, 41: 31 } as Record<number, number>;
const JQ = ".[] | [.id, .body] | @json";

const trailer = (d: unknown) => `<!-- sdd-data: ${Buffer.from(JSON.stringify(d)).toString("base64")} -->`;
const verdict = (pr: number, spec = "pass") => `<!-- spp-verdict -->\n${trailer({ ticket: String(TICKET[pr]), head: HEAD[pr], spec, quality: "pass" })}\n`;
const WAVE = { waves: [{ n: 1, tickets: ["30", "31"], workers: ["w30", "w31"], started: "2026-11-01T00:00:00Z", edges: [], prs: {} }], panel: [] };

type Opts = {
  pr?: 40 | 41;
  spec?: "pass" | "fail";
  blockerPr?: "OPEN" | "MERGED";
  checks?: { name: string; bucket: string }[];
  mergeable?: string;
  body?: string;
  base?: string;
  routing?: string;
  mergeAnswer?: { stderr: string; code: number };
};

function sub(n: number, pr: number, prState: string, blockedBy: number[], spec = "pass") {
  return {
    number: n,
    url: `${REPO}/issues/${n}`,
    title: `Ticket ${n}`,
    state: "OPEN",
    repository: { nameWithOwner: "acme/app" },
    labels: { nodes: [{ name: "ready-for-agent" }, { name: "claimed" }] },
    assignees: { nodes: [] },
    blockedBy: { nodes: blockedBy.map((b) => ({ url: `${REPO}/issues/${b}`, state: "OPEN" })) },
    closedByPullRequestsReferences: { nodes: [] },
    timelineItems: {
      nodes: [{ source: { number: pr, url: `${REPO}/pull/${pr}`, state: prState, headRefOid: HEAD[pr], repository: { nameWithOwner: "acme/app" }, body: `Closes #${n}`, comments: { nodes: [{ body: verdict(pr, spec) }] } } }],
    },
  };
}

function mergeCase(o: Opts = {}): string {
  const pr = o.pr ?? 40;
  const url = `${REPO}/pull/${pr}`;
  const dir = mkdtempSync(join(tmpdir(), "spp-merge-"));
  writeFileSync(join(dir, "args"), `${pr}\n--json\n`);
  if (o.routing) writeFileSync(join(dir, "CLAUDE.md"), `# Repo\n\n<!-- sdd-routing -->\n${o.routing}\n<!-- /sdd-routing -->\n`);
  const snapshot = {
    data: {
      repository: {
        issue: {
          number: 197,
          url: `${REPO}/issues/197`,
          title: "Epic",
          repository: { nameWithOwner: "acme/app" },
          comments: { nodes: [{ body: `<!-- sdd-plan -->\n${trailer({ branch: "feat/x" })}\n` }] },
          subIssues: { nodes: [sub(30, 40, o.blockerPr ?? "OPEN", [], pr === 40 ? o.spec : "pass"), sub(31, 41, "OPEN", [30], pr === 41 ? o.spec : "pass")] },
        },
      },
    },
  };
  const body = o.body ?? `Closes #${TICKET[pr]}\n\n## Interfaces\n\nInterfaces changed: none\n`;
  const gh = {
    [`pr view ${pr} --json number,url,state,body,baseRefName,mergeable`]: {
      stdout: { number: pr, url, state: "OPEN", body, baseRefName: o.base ?? "feat/x", mergeable: o.mergeable ?? "MERGEABLE" },
    },
    [`issue view ${REPO}/issues/${TICKET[pr]} --json parent`]: { stdout: { parent: { url: `${REPO}/issues/197` } } },
    "api graphql -f query=Snapshot -f owner=acme -f repo=app -F number=197": { stdout: snapshot },
    [`pr checks ${url} --json name,bucket`]: { stdout: o.checks ?? [{ name: "ci", bucket: "pass" }] },
    [`api repos/acme/app/issues/197/comments --paginate --jq ${JQ}`]: { stdout: JSON.stringify([88, `<!-- sdd-wave -->\nWave 1\n${trailer(WAVE)}\n`]) + "\n" },
    ...(o.mergeAnswer && { [`pr merge ${url} --squash --match-head-commit ${HEAD[pr]}`]: o.mergeAnswer }),
  };
  writeFileSync(join(dir, "gh.json"), JSON.stringify(gh));
  return dir;
}

type Write = { cmd: string; argv: string[] };
type Result = { merged: boolean; reason?: string; interfacesChanged?: string };

async function merge(o: Opts = {}, code = 0) {
  const r = await runCase("merge", mergeCase(o));
  assert.equal(r.code, code, r.stderr);
  return { ...r, out: r.json as Result, writes: r.writes as Write[] };
}

async function refused(o: Opts, reason: RegExp) {
  const r = await merge(o, 1);
  assert.equal(r.out.merged, false);
  assert.match(r.out.reason ?? "", reason);
  assert.deepEqual(r.writes, []);
}

describe("happy path", () => {
  test("spp merge 40 with gate pass, blockers merged and checks pass squash-merges once and writes wave pr once", async () => {
    const r = await merge();
    assert.deepEqual(r.out, { merged: true });
    assert.equal(r.writes.length, 2);
    assert.deepEqual(r.writes[0].argv, ["pr", "merge", `${REPO}/pull/40`, "--squash", "--match-head-commit", HEAD[40]]);
    const [, , method, path, , body] = r.writes[1].argv;
    assert.deepEqual([method, path], ["PATCH", "repos/acme/app/issues/comments/88"]);
    assert.deepEqual((readTrailer(body.slice(5)) as typeof WAVE).waves[0].prs, { "30": `${REPO}/pull/40` });
  });

  test("spp merge 41 whose blocker's pull request merged merges", async () => {
    const r = await merge({ pr: 41, blockerPr: "MERGED" });
    assert.equal(r.out.merged, true);
  });

  test("a Routing block Merge line picks the merge method", async () => {
    const r = await merge({ routing: "- Mode: org\n- Merge: rebase" });
    assert.deepEqual(r.writes[0].argv, ["pr", "merge", `${REPO}/pull/40`, "--rebase", "--match-head-commit", HEAD[40]]);
  });
});

describe("edge cases", () => {
  test("a body with Interfaces changed: createInvoice(input) prints it in interfacesChanged", async () => {
    const r = await merge({ body: "Closes #30\n\nInterfaces changed: createInvoice(input)\n" });
    assert.deepEqual(r.out, { merged: true, interfacesChanged: "createInvoice(input)" });
  });
});

describe("error paths", () => {
  test("spp merge 41 whose blocker's pull request is open refuses with blocked by #40", async () => {
    await refused({ pr: 41 }, /^blocked by #40$/);
  });

  test("checks pending refuses with checks pending", async () => {
    await refused({ checks: [{ name: "ci", bucket: "pending" }] }, /^checks pending/);
  });

  test("checks failing refuses naming the failing run", async () => {
    await refused({ checks: [{ name: "lint", bucket: "fail" }] }, /^checks failing: lint$/);
  });

  test("a gate that has not passed refuses with the ticket's state", async () => {
    await refused({ spec: "fail" }, /^gate not passed: #30 is gate-fail$/);
  });

  test("a pull request into another base than the integration branch refuses", async () => {
    await refused({ base: "main" }, /^base is main, not the integration branch feat\/x$/);
  });

  test("a merge conflict exits 3 with rebase needed and writes nothing", async () => {
    const r = await merge({ mergeable: "CONFLICTING" }, 3);
    assert.deepEqual(r.out, { merged: false, reason: "rebase needed" });
    assert.deepEqual(r.writes, []);
  });

  test("a conflict reported by the merge itself exits 3 with rebase needed and no wave write", async () => {
    const mergeAnswer = { stderr: "Pull request acme/app#40 is not mergeable: the merge commit cannot be cleanly created.\n", code: 1 };
    const r = await merge({ mergeable: "UNKNOWN", mergeAnswer }, 3);
    assert.deepEqual(r.out, { merged: false, reason: "rebase needed" });
    assert.deepEqual(r.writes.map((w) => w.argv[1]), ["merge"]);
  });

  test("a branch policy refusal exits 1 with gh's reason, never rebase needed", async () => {
    const stderr = "Pull request acme/app#40 is not mergeable: the base branch policy prohibits the merge.\n";
    const r = await merge({ mergeable: "MERGEABLE", mergeAnswer: { stderr, code: 1 } }, 1);
    assert.equal(r.out.merged, false);
    assert.match(r.out.reason ?? "", /base branch policy prohibits the merge/);
    assert.doesNotMatch(r.out.reason ?? "", /rebase needed/);
  });
});
