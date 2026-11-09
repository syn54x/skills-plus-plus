import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { describe, test } from "node:test";
import { isAttended, passDecision } from "../src/attended.ts";
import type { EpicState, Ticket } from "../src/derive.ts";
import { readTrailer } from "../src/markers.ts";
import { planNext } from "../src/plan-next.ts";
import { runCase } from "./harness.ts";

// One Epic, acme/app#197 on integration branch feat/x: ticket #30 (pull request #40) and ticket #31 (pull request #41),
// which #30 blocks. Both pull requests carry a passing verdict on their head unless a case says otherwise.
const REPO = "https://github.com/acme/app";
const HEAD = { 40: "4".repeat(40), 41: "5".repeat(40) } as Record<number, string>;
const TICKET = { 40: 30, 41: 31 } as Record<number, number>;
const JQ = ".[] | [.id, .body, .user.login, .author_association] | @json";
const VIEWER = "api graphql -f query=Viewer --jq .data.viewer.login";

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
  forged?: boolean; // the snapshot's only verdict comment is a passing one from an outside author
  recheck?: "forged"; // the verdict comment spp merge re-reads is from an outside author
  epicMissing?: boolean; // the snapshot query finds no Epic issue: gh exits 1 and prints issue null
  waveFails?: boolean; // reading the wave comment fails, so recording the merge on it fails
  fix?: { verdict?: "pass" | "outsider" | "none"; author?: string }; // a fix pull request 50 into feat/x instead of a slice
  noParent?: true | number; // the issue the body names has no parent (true: #999; a number: that closing line's issue)
  closedFails?: { issue: number; stderr: string }; // gh fails reading this issue's parent
  otherEpic?: boolean; // #88 is a Sub-issue of a second Epic, acme/app#198, on branch feat/y
  foreign?: boolean; // #30 also has an open pull request in mallory/fork that says it closes it
};

// gh's answer to a query for an issue that does not exist: exit 1, the response still printed.
const MISSING = { stdout: { data: { repository: { issue: null } }, errors: [{ message: "Could not resolve to an Issue with the number of 197." }] }, stderr: "GraphQL: Could not resolve to an Issue with the number of 197. (repository.issue)", code: 1 };

// A comment by the repository owner, or by an outside author when `outsider`.
const by = (body: string, outsider = false) => ({ body, author: { login: outsider ? "mallory" : "maint" }, authorAssociation: outsider ? "NONE" : "OWNER" });

// A pull request as the snapshot query returns it, opened by the repository owner.
const prNode = (pr: number, state: string, repo: string, body: string, comments: unknown[]) => ({
  number: pr,
  url: `https://github.com/${repo}/pull/${pr}`,
  state,
  headRefOid: HEAD[pr] ?? "9".repeat(40),
  baseRefName: "feat/x",
  repository: { nameWithOwner: repo },
  author: { login: "maint" },
  authorAssociation: "OWNER",
  body,
  comments: { nodes: comments },
});

// foreign: an open pull request numbered 999 in mallory/fork that also says it closes the ticket.
function sub(n: number, pr: number, prState: string, blockedBy: number[], spec = "pass", forged = false, foreign = false) {
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
      nodes: [
        { source: prNode(pr, prState, "acme/app", `Closes #${n}`, [by(verdict(pr, spec), forged)]) },
        ...(foreign ? [{ source: prNode(999, "OPEN", "mallory/fork", `Closes acme/app#${n}`, []) }] : []),
      ],
    },
  };
}

function mergeCase(o: Opts = {}): string {
  const pr = (o.fix ? 50 : o.pr ?? 40) as 40 | 41;
  const url = `${REPO}/pull/${pr}`;
  const dir = mkdtempSync(join(tmpdir(), "spp-merge-"));
  writeFileSync(join(dir, "args"), `${pr}\n--json\n`);
  if (o.routing) writeFileSync(join(dir, "CLAUDE.md"), `# Repo\n\n<!-- sdd-routing -->\n${o.routing}\n<!-- /sdd-routing -->\n`);
  const snapshot = {
    data: {
      viewer: { login: "maint" },
      repository: {
        issue: {
          number: 197,
          url: `${REPO}/issues/197`,
          title: "Epic",
          repository: { nameWithOwner: "acme/app" },
          comments: { nodes: [by(`<!-- sdd-plan -->\n${trailer({ branch: "feat/x" })}\n`)] },
          subIssues: { nodes: [sub(30, 40, o.blockerPr ?? "OPEN", [], pr === 40 ? o.spec : "pass", pr === 40 && o.forged, o.foreign), sub(31, 41, "OPEN", [30], pr === 41 ? o.spec : "pass")] },
        },
      },
    },
  };
  const body = o.body ?? (o.fix ? `Refs #30\n\nA fix.\n` : `Closes #${TICKET[pr]}\n\n## Interfaces\n\nInterfaces changed: none\n`);
  const gh: Record<string, unknown> = {
    [`pr view ${pr} --json number,url,state,body,baseRefName,mergeable`]: {
      stdout: { number: pr, url, state: "OPEN", body, baseRefName: o.base ?? "feat/x", mergeable: o.mergeable ?? "MERGEABLE" },
    },
    [`issue view ${REPO}/issues/${TICKET[pr]} --json parent`]: { stdout: { parent: { url: `${REPO}/issues/197` } } },
    "api graphql -f query=Snapshot -f owner=acme -f repo=app -F number=197": o.epicMissing ? MISSING : { stdout: snapshot },
    [`pr checks ${url} --json name,bucket`]: { stdout: o.checks ?? [{ name: "ci", bucket: "pass" }] },
    [`api repos/acme/app/issues/197/comments --paginate --jq ${JQ}`]: o.waveFails
      ? { stderr: "HTTP 502: Bad Gateway", code: 1 }
      : { stdout: JSON.stringify([88, `<!-- sdd-wave -->\nWave 1\n${trailer(WAVE)}\n`, "maint", "OWNER"]) + "\n" },
    [`api repos/acme/app/issues/${pr}/comments --paginate --jq ${JQ}`]: {
      stdout: JSON.stringify([99, verdict(pr, pr === 40 ? o.spec : "pass"), ...(o.recheck ? ["mallory", "NONE"] : ["maint", "OWNER"])]) + "\n",
    },
    [VIEWER]: { stdout: "maint\n" },
    "api graphql -f query=PullRequests *": { stdout: { data: { viewer: { login: "maint" }, repository: { pullRequests: { nodes: [] } } } } },
    ...(o.mergeAnswer && { [`pr merge ${url} --squash --match-head-commit ${HEAD[pr]}`]: o.mergeAnswer }),
  };
  if (o.fix) {
    HEAD[50] = "6".repeat(40);
    const v = o.fix.verdict ?? "pass";
    const comments = v === "none" ? [] : [by(`<!-- spp-verdict -->\n${trailer({ ticket: "30", head: HEAD[50], spec: "pass", quality: "pass" })}\n`, v === "outsider")];
    const fixPr = { ...prNode(50, "OPEN", "acme/app", body, comments), baseRefName: o.base ?? "feat/x" };
    if (o.fix.author) Object.assign(fixPr, { author: { login: o.fix.author }, authorAssociation: "NONE" });
    gh["api graphql -f query=PullRequests *"] = { stdout: { data: { viewer: { login: "maint" }, repository: { pullRequests: { nodes: o.base && o.base !== "feat/x" ? [] : [fixPr] } } } } };
    gh[`api repos/acme/app/issues/50/comments --paginate --jq ${JQ}`] = { stdout: comments.length ? JSON.stringify([99, comments[0].body, comments[0].author.login, comments[0].authorAssociation]) + "\n" : "" };
    gh[`pr view 50 --json number,url,state,body,baseRefName,mergeable`] = { stdout: { number: 50, url: `${REPO}/pull/50`, state: "OPEN", body, baseRefName: o.base ?? "feat/x", mergeable: o.mergeable ?? "MERGEABLE" } };
    gh[`issue view ${REPO}/issues/30 --json parent`] = { stdout: { parent: { url: `${REPO}/issues/197` } } };
    if (o.noParent) gh[`issue view ${REPO}/issues/${o.noParent === true ? 999 : o.noParent} --json parent`] = { stdout: { parent: null } };
    gh[`issue view ${REPO}/issues/31 --json parent`] = { stdout: { parent: { url: `${REPO}/issues/197` } } };
    gh[`pr checks ${REPO}/pull/50 --json name,bucket`] = { stdout: o.checks ?? [{ name: "ci", bucket: "pass" }] };
  }
  if (o.otherEpic) {
    const epicB = { ...snapshot.data.repository.issue, number: 198, url: `${REPO}/issues/198`, comments: { nodes: [by(`<!-- sdd-plan -->\n${trailer({ branch: "feat/y" })}\n`)] }, subIssues: { nodes: [sub(88, 77, "OPEN", [])] } };
    gh["api graphql -f query=Snapshot -f owner=acme -f repo=app -F number=198"] = { stdout: { data: { viewer: { login: "maint" }, repository: { issue: epicB } } } };
    gh[`issue view ${REPO}/issues/88 --json parent`] = { stdout: { parent: { url: `${REPO}/issues/198` } } };
  }
  if (o.closedFails) gh[`issue view ${REPO}/issues/${o.closedFails.issue} --json parent`] = { stderr: o.closedFails.stderr, code: 1 };
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

describe("the passed attended decision", () => {
  // R2-F8: the merged slice's worker is resumed for the Epic's fix round while #30 stays open, so its decision stays.
  test("spp merge 40 keeps ticket 30's passed decision: the worker in sdd/30-x still counts as attended", async () => {
    const env = { XDG_STATE_HOME: mkdtempSync(join(tmpdir(), "spp-merge-state-")), HOME: "" };
    passDecision(env, "acme/app", 30, true);
    const saved = { ...process.env };
    process.env.XDG_STATE_HOME = env.XDG_STATE_HOME;
    try {
      await merge({}, 0);
      const dir = mkdtempSync(join(tmpdir(), "spp-merge-worker-"));
      spawnSync("git", ["init", "-q", "-b", "sdd/30-x"], { cwd: dir });
      const bin = mkdtempSync(join(tmpdir(), "spp-merge-gh-"));
      writeFileSync(join(bin, "gh"), `#!/bin/sh\necho '{"state":"OPEN"}'\n`, { mode: 0o755 });
      process.env.PATH = `${bin}${delimiter}${saved.PATH}`;
      delete process.env.CI;
      assert.equal(isAttended({ ...env, CLAUDE_CODE_SESSION_ATTENDED: "0" }, { repo: "acme/app", dir }), true);
    } finally {
      process.env = saved;
    }
  });
});

describe("fix pull request", () => {
  const FIX = { fix: {} };
  const FIX_URL = `${REPO}/pull/50`;

  test("spp merge 50 on a Refs #30 fix with a trusted passing verdict merges once pinned to its head and writes no wave", async () => {
    const r = await merge(FIX);
    assert.deepEqual(r.out, { merged: true });
    assert.deepEqual(r.writes.map((w) => w.argv), [["pr", "merge", FIX_URL, "--squash", "--match-head-commit", "6".repeat(40)]]);
  });

  test("no verdict comment refuses with no passing verdict from a trusted author", async () => {
    await refused({ fix: { verdict: "none" } }, /^no passing verdict from a trusted author on #50$/);
  });

  test("a verdict by an author with no association refuses with the same reason", async () => {
    await refused({ fix: { verdict: "outsider" } }, /^no passing verdict from a trusted author on #50$/);
  });

  test("a fix based on main refuses naming the integration branch", async () => {
    await refused({ fix: {}, base: "main" }, /^base is main, not the integration branch feat\/x$/);
  });

  test("failing checks refuse naming the run", async () => {
    await refused({ fix: {}, checks: [{ name: "lint", bucket: "fail" }] }, /^checks failing: lint$/);
  });

  test("a conflict exits 3 with rebase needed", async () => {
    const r = await merge({ fix: {}, mergeable: "CONFLICTING" }, 3);
    assert.deepEqual(r.out, { merged: false, reason: "rebase needed" });
  });

  test("an untrusted author's pull request is not a fix and refuses", async () => {
    await refused({ fix: { author: "mallory" } }, /^#50 is not a fix of #197$/);
  });

  test("a Refs line naming an issue with no parent refuses with has no epic", async () => {
    await refused({ fix: {}, body: "Refs #999\n", noParent: true }, /^#999 has no epic$/);
  });

  test("a Refs line plus a closing line for an issue outside any Epic still merges as a fix", async () => {
    const r = await merge({ fix: {}, body: "Refs #30\n\nFixes #303\n", noParent: 303 });
    assert.deepEqual(r.writes.map((w) => w.argv[1]), ["merge"]);
  });

  test("a body that only closes an issue outside any Epic refuses with its own reason", async () => {
    await refused({ fix: {}, body: "Fixes #303\n", noParent: 303 }, /^closes no Sub-issue of an Epic and refs no Sub-issue$/);
  });

  test("a closed issue gh cannot resolve falls through to the fix path", async () => {
    const closedFails = { issue: 303, stderr: "GraphQL: Could not resolve to an Issue with the number of 303." };
    const r = await merge({ fix: {}, body: "Refs #30\n\nFixes #303\n", closedFails });
    assert.deepEqual(r.writes.map((w) => w.argv[1]), ["merge"]);
  });

  test("a transient gh failure on the closed issue fails with gh's message, for a Refs body and a slice body", async () => {
    const stderr = "HTTP 502: Bad Gateway";
    for (const o of [{ fix: {}, body: "Refs #30\n\nFixes #303\n", closedFails: { issue: 303, stderr } }, { closedFails: { issue: 30, stderr } }] as Opts[]) {
      const r = await runCase("merge", mergeCase(o));
      assert.equal(r.code, 1);
      assert.match(r.stderr, /HTTP 502: Bad Gateway/);
      assert.deepEqual(r.writes, []);
    }
  });

  test("a fix that Refs #30 and says Fixes #88, a Sub-issue of another Epic on another branch, merges as a fix", async () => {
    const r = await merge({ fix: {}, body: "Refs #30\n\nFixes #88\n", otherEpic: true });
    assert.deepEqual(r.writes.map((w) => w.argv[1]), ["merge"]);
  });

  test("a same-Epic pull request that closes #30 but is not its own keeps the slice refusal", async () => {
    await refused({ fix: {}, body: "Closes #30\n" }, /^gate not passed: #30 is gate-pass$/);
  });

  test("a body with neither a closing line nor Refs refuses with closes no issue and refs no Sub-issue", async () => {
    await refused({ fix: {}, body: "Just a change\n" }, /^closes no issue and refs no Sub-issue$/);
  });

  // #385: a closing line opens with the keyword, and `#N's` is prose.
  test("a fix whose prose says it also fixes #31's flake merges as a fix of #30, not refused as #31's slice", async () => {
    const r = await merge({ fix: {}, body: "Refs #30\n\nThis also fixes #31's flake.\n" });
    assert.deepEqual(r.out, { merged: true });
    assert.deepEqual(r.writes.map((w) => w.argv), [["pr", "merge", FIX_URL, "--squash", "--match-head-commit", "6".repeat(40)]]);
  });

  test("a body whose prose says it fixes #303 too, with no Refs line, closes no issue", async () => {
    await refused({ fix: {}, body: "This fixes #303 too.\n", noParent: 303 }, /^closes no issue and refs no Sub-issue$/);
  });
});

describe("edge cases", () => {
  // #385: the prose line before the closing line names another ticket, which is not what the pull request closes.
  test("#30's own pull request whose prose also fixes #31's flake, then Closes #30, merges as #30's slice", async () => {
    const r = await merge({ body: "This also fixes #31's flake.\nCloses #30\n" });
    assert.deepEqual(r.out, { merged: true });
    assert.equal(r.writes.length, 2);
    assert.deepEqual(r.writes[0].argv, ["pr", "merge", `${REPO}/pull/40`, "--squash", "--match-head-commit", HEAD[40]]);
  });

  // F39 (Round 3) on #267.
  test("a stranger's open pull request in another repository that says it closes #30 does not stop #30's own from merging", async () => {
    const r = await merge({ foreign: true });
    assert.deepEqual(r.out, { merged: true });
    assert.deepEqual(r.writes[0].argv, ["pr", "merge", `${REPO}/pull/40`, "--squash", "--match-head-commit", HEAD[40]]);
  });

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

  test("a forged passing verdict from an outside author is not a gate pass: refuses and merges nothing", async () => {
    await refused({ forged: true }, /^gate not passed: #30 is pr-open$/);
  });

  test("the verdict re-read at merge time from an outside author refuses, though the snapshot showed a pass", async () => {
    await refused({ recheck: "forged" }, /^no passing verdict from a trusted author on #40$/);
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

  // F9 on #267: merge reads the snapshot through fetchSnapshot, which names a missing Epic like status and retro do.
  test("an Epic that does not exist exits 1 with epic not found and merges nothing", async () => {
    const r = await runCase("merge", mergeCase({ epicMissing: true }));
    assert.equal(r.code, 1);
    assert.match(r.stderr, /^spp merge: epic not found$/m);
    assert.deepEqual(r.writes, []);
  });

  // F6 on #267: the merge happened, so it says merged true, but exit 1 and the stderr line send the orchestrator to record it.
  test("a merge whose wave record fails exits 1 with merged true and says the record failed", async () => {
    const r = await runCase("merge", mergeCase({ waveFails: true }));
    assert.equal(r.code, 1, r.stderr);
    assert.deepEqual(r.json, { merged: true });
    assert.match(r.stderr, /^spp merge: merged #40, but recording it on the wave comment failed:\n.*HTTP 502: Bad Gateway/m);
    assert.deepEqual((r.writes as Write[]).map((w) => w.argv.slice(0, 2)), [["pr", "merge"]]);
  });

  test("a branch policy refusal exits 1 with gh's reason, never rebase needed", async () => {
    const stderr = "Pull request acme/app#40 is not mergeable: the base branch policy prohibits the merge.\n";
    const r = await merge({ mergeable: "MERGEABLE", mergeAnswer: { stderr, code: 1 } }, 1);
    assert.equal(r.out.merged, false);
    assert.match(r.out.reason ?? "", /base branch policy prohibits the merge/);
    assert.doesNotMatch(r.out.reason ?? "", /rebase needed/);
  });
});

// F10 on #267: a cross-repo ticket goes from spp next (its issue URL) through wave add to spp merge, whose wave pr
// names it owner/repo#N; wave pr matches the equivalent forms, so the merge exits 0 and records the pull request.
describe("integration", () => {
  const EPIC = `${REPO}/issues/197`;
  const API = "https://github.com/acme/api";
  const TICKET_URL = `${API}/issues/7`;
  const PR_URL = `${API}/pull/50`;
  const SHA = "7".repeat(40);
  const VERDICT = `<!-- spp-verdict -->\n${trailer({ ticket: "7", head: SHA, spec: "pass", quality: "pass" })}\n`;

  test("a cross-repo ticket dispatched by next and recorded by wave add merges with exit 0 and its PR on the wave", async () => {
    // 1. spp next names the cross-repo ticket by its issue URL.
    const ticket: Ticket = {
      ...{ number: 7, url: TICKET_URL, repo: "acme/api", title: "Api ticket", size: "S", state: "ready", layer: 0, blockedBy: [], landed: false },
      ...{ claimed: false, assignees: [], labels: ["ready-for-agent"], pr: null, worker: null, note: null },
    };
    const counts = { blocked: 0, ready: 1, claimed: 0, "pr-open": 0, "gate-pass": 0, "gate-fail": 0, merged: 0, "handed-back": 0, "not-agent": 0 };
    const state: EpicState = { epic: { number: 197, url: EPIC, repo: "acme/app", title: "Epic", branch: "feat/x" }, tickets: [ticket], layers: [[TICKET_URL]], cycle: [], counts, fixes: [] };
    const wave = { wave: ["acme/api#7"], held: [] };
    const [dispatch] = planNext({ state, panel: { tickets: 5, lines: 1000, sizeL: true }, sessions: [], wave, checks: {}, failedHeads: {}, mainPr: null });
    assert.deepEqual(dispatch.tickets, [TICKET_URL]);

    // 2. The build records the Wave from those ids.
    const add = mkdtempSync(join(tmpdir(), "spp-wave-add-"));
    const addArgs = [EPIC, "add", "--n", "1", "--tickets", dispatch.tickets!.join(","), "--workers", "t-7", "--started", "2026-11-02T00:00:00Z", "--edges", "none"];
    writeFileSync(join(add, "args"), addArgs.join("\n") + "\n");
    writeFileSync(join(add, "gh.json"), JSON.stringify({ [`api repos/acme/app/issues/197/comments --paginate --jq ${JQ}`]: { stdout: "" } }));
    const added = await runCase("wave", add);
    assert.equal(added.code, 0, added.stderr);
    const waveBody = (added.writes as Write[])[0].argv.find((a) => a.startsWith("body="))!.slice(5);

    // 3. spp merge merges its pull request and records it on that wave.
    const dir = mkdtempSync(join(tmpdir(), "spp-merge-xrepo-"));
    writeFileSync(join(dir, "args"), `${PR_URL}\n--json\n`);
    const pr = { number: 50, url: PR_URL, state: "OPEN", headRefOid: SHA, baseRefName: "feat/x", repository: { nameWithOwner: "acme/api" }, author: { login: "maint" }, authorAssociation: "OWNER", comments: { nodes: [by(VERDICT)] } };
    const issue = {
      ...{ number: 7, url: TICKET_URL, title: "Api ticket", state: "OPEN", repository: { nameWithOwner: "acme/api" } },
      ...{ labels: { nodes: [{ name: "ready-for-agent" }, { name: "claimed" }] }, assignees: { nodes: [] }, blockedBy: { nodes: [] } },
      ...{ closedByPullRequestsReferences: { nodes: [pr] }, timelineItems: { nodes: [] } },
    };
    const plan = by(`<!-- sdd-plan -->\n${trailer({ branch: "feat/x" })}\n`);
    const epic = { number: 197, url: EPIC, title: "Epic", repository: { nameWithOwner: "acme/app" }, comments: { nodes: [plan] }, subIssues: { nodes: [issue] } };
    const row = (id: number, body: string) => JSON.stringify([id, body, "maint", "OWNER"]) + "\n";
    const gh = {
      [`pr view ${PR_URL} --json number,url,state,body,baseRefName,mergeable`]: {
        stdout: { number: 50, url: PR_URL, state: "OPEN", body: "Closes acme/api#7\n", baseRefName: "feat/x", mergeable: "MERGEABLE" },
      },
      [`issue view ${TICKET_URL} --json parent`]: { stdout: { parent: { url: EPIC } } },
      "api graphql -f query=Snapshot -f owner=acme -f repo=app -F number=197": { stdout: { data: { viewer: { login: "maint" }, repository: { issue: epic } } } },
      [`pr checks ${PR_URL} --json name,bucket`]: { stdout: [{ name: "ci", bucket: "pass" }] },
      [`api repos/acme/api/issues/50/comments --paginate --jq ${JQ}`]: { stdout: row(99, VERDICT) },
      [`api repos/acme/app/issues/197/comments --paginate --jq ${JQ}`]: { stdout: row(88, waveBody) },
      "api graphql -f query=PullRequests *": { stdout: { data: { viewer: { login: "maint" }, repository: { pullRequests: { nodes: [] } } } } },
    };
    writeFileSync(join(dir, "gh.json"), JSON.stringify(gh));
    const r = await runCase("merge", dir);
    assert.equal(r.code, 0, r.stderr);
    assert.deepEqual(r.json, { merged: true });
    const writes = r.writes as Write[];
    assert.deepEqual(writes[0].argv.slice(0, 3), ["pr", "merge", PR_URL]);
    assert.deepEqual(writes[1].argv.slice(1, 4), ["-X", "PATCH", "repos/acme/app/issues/comments/88"]);
    assert.deepEqual((readTrailer(writes[1].argv.find((a) => a.startsWith("body="))!.slice(5)) as typeof WAVE).waves[0].prs, { [TICKET_URL]: PR_URL });
  });
});
