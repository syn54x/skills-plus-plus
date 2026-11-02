import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { runCase } from "./harness.ts";

type Verdict = { head: string; spec: "pass" | "fail"; quality: "pass" | "fail" };
type PrSpec = { n: number; state?: "OPEN" | "MERGED" | "CLOSED"; head?: string; verdict?: Verdict; checks?: string; history?: Verdict[] };
type Spec = { n: number; closed?: boolean; labels?: string[]; assignees?: string[]; blockedBy?: number[]; pr?: PrSpec; worker?: string };
type Opts = {
  branch?: string | null;
  panel?: string;
  mainPr?: { state: "OPEN" | "MERGED" | "CLOSED"; lines: number } | null;
  agents?: unknown[];
  env?: Record<string, string>;
  epicState?: string;
};
type Action = { kind: string; tickets?: string[]; pr?: string; driver?: string; panel?: boolean; reason: string };

const ISSUE = "https://github.com/acme/app/issues/";
const PULL = "https://github.com/acme/app/pull/";
const HEAD = "a".repeat(40);
const READY = ["ready-for-agent", "size:S"];
const COMMENTS = "api repos/{owner}/{repo}/issues/197/comments --paginate --jq .[] | [.id, .body] | @json";
const SNAPSHOT = "api graphql -f query=Snapshot -F owner={owner} -F repo={repo} -F number=197";

const trailer = (marker: string, data: unknown) => `${marker}\nrendered\n<!-- sdd-data: ${Buffer.from(JSON.stringify(data)).toString("base64")} -->`;
const verdictBody = (v: Verdict) => trailer("<!-- spp-verdict -->", { ticket: "x", ...v });
const ticketBody = (n: number) => `## Files owned\n\n- Create: \`src/f${n}.ts\`\n\n## Interfaces\n\n- Consumes: none\n- Produces: none\n`;

// A case directory for Epic 197 in acme/app: its Sub-issues, their pull requests, CI and verdict history,
// the pull request to the base branch, the Routing block and the claude session list.
function scratch(tickets: Spec[], o: Opts = {}): string {
  const dir = mkdtempSync(join(tmpdir(), "spp-next-"));
  const branch = o.branch === undefined ? "feat/epic" : o.branch;
  const plan = trailer("<!-- sdd-plan -->", branch ? { branch } : {});
  const pr = (p: PrSpec) => ({
    number: p.n,
    url: PULL + p.n,
    state: p.state ?? "OPEN",
    headRefOid: p.head ?? HEAD,
    repository: { nameWithOwner: "acme/app" },
    comments: { nodes: p.verdict ? [{ body: verdictBody(p.verdict) }] : [] },
  });
  const node = (t: Spec) => ({
    number: t.n,
    url: ISSUE + t.n,
    title: `Ticket ${t.n}`,
    state: t.closed ? "CLOSED" : "OPEN",
    repository: { nameWithOwner: "acme/app" },
    labels: { nodes: (t.labels ?? READY).map((name) => ({ name })) },
    assignees: { nodes: (t.assignees ?? []).map((login) => ({ login })) },
    blockedBy: { nodes: (t.blockedBy ?? []).map((b) => ({ url: ISSUE + b, state: tickets.find((x) => x.n === b)?.closed ? "CLOSED" : "OPEN" })) },
    comments: { nodes: t.worker ? [{ body: trailer("<!-- sdd-progress -->", { worker: t.worker }) }] : [] },
    closedByPullRequestsReferences: { nodes: t.pr ? [pr(t.pr)] : [] },
    timelineItems: { nodes: [] },
  });
  const gh: Record<string, unknown> = {
    "--version": { stdout: "gh version 2.95.0 (2026-06-01)\n" },
    "issue view 197 --json state,subIssuesSummary": { stdout: { state: o.epicState ?? "OPEN", subIssuesSummary: { total: tickets.length } } },
    [COMMENTS]: { stdout: JSON.stringify([1, plan]) + "\n" },
    [SNAPSHOT]: {
      stdout: {
        data: {
          repository: {
            issue: {
              number: 197,
              url: ISSUE + 197,
              title: "Epic",
              repository: { nameWithOwner: "acme/app" },
              comments: { nodes: [{ body: plan }] },
              subIssues: { nodes: tickets.map(node) },
            },
          },
        },
      },
    },
  };
  for (const t of tickets) {
    gh[`issue view ${ISSUE}${t.n} --json body`] = { stdout: { body: ticketBody(t.n) } };
    if (!t.pr) continue;
    gh[`pr checks ${PULL}${t.pr.n} --json name,bucket`] = { stdout: [{ name: "test", bucket: t.pr.checks ?? "pass" }] };
    const history = t.pr.history ?? (t.pr.verdict ? [t.pr.verdict] : []);
    const [current, ...older] = [...history].reverse();
    gh[`api graphql -f query=VerdictHistory -f owner=acme -f repo=app -F number=${t.pr.n}`] = {
      stdout: {
        data: {
          repository: {
            pullRequest: {
              comments: { nodes: current ? [{ body: verdictBody(current), userContentEdits: { nodes: [current, ...older].map((v) => ({ diff: verdictBody(v) })) } }] : [] },
            },
          },
        },
      },
    };
  }
  if (branch) {
    const m = o.mainPr;
    const prs = m ? [{ number: 900, url: PULL + 900, state: m.state, additions: m.lines - 10, deletions: 10 }] : [];
    gh[`pr list -R acme/app --head ${branch} --state all --json number,url,state,additions,deletions`] = { stdout: prs };
  }
  writeFileSync(join(dir, "gh.json"), JSON.stringify(gh));
  if (o.agents) writeFileSync(join(dir, "agents.json"), JSON.stringify({ "agents --json --all": { stdout: o.agents } }));
  const routing = ["<!-- sdd-routing -->", "- Mode: org", "- Laws: CLAUDE.md", ...(o.panel ? [`- Panel: ${o.panel}`] : []), "<!-- /sdd-routing -->"];
  writeFileSync(join(dir, "CLAUDE.md"), routing.join("\n") + "\n");
  writeFileSync(join(dir, "args"), "197\n--json\n");
  return dir;
}

async function next(tickets: Spec[], o: Opts = {}): Promise<Action[]> {
  const dir = scratch(tickets, o);
  const socket = process.env.CLAUDE_CODE_MESSAGING_SOCKET;
  delete process.env.CLAUDE_CODE_MESSAGING_SOCKET;
  Object.assign(process.env, o.env);
  try {
    const r = await runCase("next", dir);
    assert.equal(r.code, 0, r.stderr);
    assert.deepEqual(r.writes, [], "spp next writes nothing");
    return (r.json as { actions: Action[] }).actions;
  } finally {
    if (socket === undefined) delete process.env.CLAUDE_CODE_MESSAGING_SOCKET;
    else process.env.CLAUDE_CODE_MESSAGING_SOCKET = socket;
  }
}

const kinds = (actions: Action[]) => actions.map((a) => a.kind);
const merged = (n: number, labels = READY): Spec => ({ n, closed: true, labels, pr: { n: n + 100, state: "MERGED" } });
const PASS: Verdict = { head: HEAD, spec: "pass", quality: "pass" };
const FAIL: Verdict = { head: HEAD, spec: "pass", quality: "fail" };

describe("happy path", () => {
  test("two ready tickets, no workers, a branch: one dispatch action with both tickets", async () => {
    const actions = await next([{ n: 12 }, { n: 13 }]);
    assert.deepEqual(actions, [{ kind: "dispatch", tickets: ["12", "13"], driver: "subagent", reason: actions[0].reason }]);
  });

  test("a pr-open ticket with checks pass and no verdict: gate for its pull request", async () => {
    const actions = await next([{ n: 12, labels: [...READY, "claimed"], pr: { n: 40 } }]);
    assert.deepEqual(kinds(actions), ["gate"]);
    assert.equal(actions[0].pr, PULL + 40);
    assert.deepEqual(actions[0].tickets, ["12"]);
  });

  test("a gate-pass ticket whose blocker merged: merge", async () => {
    const actions = await next([merged(12), { n: 13, blockedBy: [12], pr: { n: 41, verdict: PASS } }]);
    assert.deepEqual(kinds(actions), ["merge"]);
    assert.equal(actions[0].pr, PULL + 41);
  });

  test("every ticket merged, five tickets: main-gate with panel true", async () => {
    const actions = await next([1, 2, 3, 4, 5].map((n) => merged(n)), { mainPr: { state: "OPEN", lines: 300 } });
    assert.deepEqual(actions, [{ kind: "main-gate", pr: PULL + 900, panel: true, reason: actions[0].reason }]);
  });

  test("every ticket merged and no pull request to the base branch yet: main-gate says to open it, panel left undecided", async () => {
    const actions = await next([1, 2, 3, 4, 5].map((n) => merged(n)), { mainPr: null });
    assert.deepEqual(actions, [{ kind: "main-gate", reason: actions[0].reason }]);
    assert.match(actions[0].reason, /open the pull request to the base branch/);
  });

  test("the pull request to the base branch merged: close", async () => {
    const actions = await next([merged(1)], { mainPr: { state: "MERGED", lines: 50 } });
    assert.deepEqual(actions, [{ kind: "close", pr: PULL + 900, reason: actions[0].reason }]);
  });

  test("dispatch names bg as the driver when the messaging socket is set", async () => {
    const actions = await next([{ n: 12 }], { env: { CLAUDE_CODE_MESSAGING_SOCKET: "/tmp/sock" } });
    assert.equal(actions[0].driver, "bg");
  });
});

describe("edge cases", () => {
  test("a gate-pass ticket whose blocker is still open: no merge, wait instead", async () => {
    const actions = await next([
      { n: 12, labels: [...READY, "claimed"] },
      { n: 13, blockedBy: [12], pr: { n: 41, verdict: PASS } },
    ]);
    assert.deepEqual(kinds(actions), ["wait"]);
  });

  test("a handed-back ticket whose pull request stays open is not handed back again: stuck, and spp status agrees", async () => {
    const tickets: Spec[] = [{ n: 12, labels: ["size:S", "needs-info"], pr: { n: 40, verdict: FAIL, history: [{ ...FAIL, head: "b".repeat(40) }, FAIL] } }];
    const actions = await next(tickets);
    assert.deepEqual(kinds(actions), ["stuck"]);
    assert.match(actions[0].reason, /#12 is handed back/);
    const status = await runCase("status", scratch(tickets));
    assert.equal((status.json as { tickets: { state: string }[] }).tickets[0].state, "handed-back");
  });

  test("a pr-open ticket with failing checks: fix naming the failing check", async () => {
    const actions = await next([{ n: 12, labels: [...READY, "claimed"], pr: { n: 40, checks: "fail" } }]);
    assert.deepEqual(kinds(actions), ["fix"]);
    assert.equal(actions[0].pr, PULL + 40);
    assert.match(actions[0].reason, /checks fail: test/);
  });

  test("a pr-open ticket with pending checks stays in flight: wait", async () => {
    assert.deepEqual(kinds(await next([{ n: 12, labels: [...READY, "claimed"], pr: { n: 40, checks: "pending" } }])), ["wait"]);
  });

  test("a gate-fail ticket whose worker is still running its fix round: wait, not fix again", async () => {
    const actions = await next([{ n: 12, labels: [...READY, "claimed"], worker: "t-12", pr: { n: 40, verdict: FAIL } }], {
      agents: [{ name: "t-12", kind: "background", state: "working" }],
    });
    assert.deepEqual(kinds(actions), ["wait"]);
    assert.match(actions[0].reason, /t-12 working/);
  });

  test("a gate-fail ticket in its first fix round: fix", async () => {
    const actions = await next([{ n: 12, labels: [...READY, "claimed"], pr: { n: 40, verdict: FAIL } }]);
    assert.deepEqual(kinds(actions), ["fix"]);
    assert.equal(actions[0].pr, PULL + 40);
  });

  test("a gate-fail ticket after one fix round: hand-back", async () => {
    const first: Verdict = { head: "b".repeat(40), spec: "fail", quality: "pass" };
    const actions = await next([{ n: 12, labels: [...READY, "claimed"], pr: { n: 40, verdict: FAIL, history: [first, FAIL] } }]);
    assert.deepEqual(kinds(actions), ["hand-back"]);
    assert.deepEqual(actions[0].tickets, ["12"]);
  });

  test("every ticket merged, two size S tickets, 200 changed lines: main-gate with panel false", async () => {
    const actions = await next([merged(1), merged(2)], { mainPr: { state: "OPEN", lines: 200 } });
    assert.deepEqual(actions, [{ kind: "main-gate", pr: PULL + 900, panel: false, reason: actions[0].reason }]);
  });

  test("any size L ticket runs the panel", async () => {
    const actions = await next([merged(1), merged(2, ["ready-for-agent", "size:L"])], { mainPr: { state: "OPEN", lines: 200 } });
    assert.equal(actions[0].panel, true);
  });

  test("1,000 changed lines runs the panel", async () => {
    const actions = await next([merged(1), merged(2)], { mainPr: { state: "OPEN", lines: 1000 } });
    assert.equal(actions[0].panel, true);
  });

  test("Routing block Panel: tickets>=10 with five tickets and no size L: panel false", async () => {
    const actions = await next([1, 2, 3, 4, 5].map((n) => merged(n)), { mainPr: { state: "OPEN", lines: 300 }, panel: "tickets>=10" });
    assert.equal(actions[0].panel, false);
  });

  test("a ready ticket whose dispatched worker session is still working is waited on, not dispatched again", async () => {
    const actions = await next([{ n: 12, worker: "t-12" }], { agents: [{ name: "t-12", kind: "background", state: "working" }] });
    assert.deepEqual(kinds(actions), ["wait"]);
    assert.match(actions[0].reason, /t-12/);
  });

  test("a pull request merged into the integration branch counts as merged while its issue is still open", async () => {
    const actions = await next([{ n: 12, labels: [...READY, "claimed"], pr: { n: 40, state: "MERGED" } }], { mainPr: null });
    assert.deepEqual(kinds(actions), ["main-gate"]);
  });
});

describe("error paths", () => {
  test("open tickets, none ready, none claimed: stuck with the missing label in reason", async () => {
    const actions = await next([{ n: 12, labels: ["size:S"] }]);
    assert.deepEqual(kinds(actions), ["stuck"]);
    assert.match(actions[0].reason, /#12 .*ready-for-agent/);
  });

  test("open tickets in a cycle: stuck with the cycle in reason", async () => {
    const actions = await next([{ n: 12, blockedBy: [13] }, { n: 13, blockedBy: [12] }]);
    assert.deepEqual(kinds(actions), ["stuck"]);
    assert.match(actions[0].reason, /cycle: #12, #13/);
  });

  test("no integration branch: branch", async () => {
    assert.deepEqual(kinds(await next([{ n: 12 }], { branch: null })), ["branch"]);
  });

  test("a failing preflight: preflight with the failure and its fix", async () => {
    const actions = await next([{ n: 12 }], { epicState: "CLOSED" });
    assert.deepEqual(kinds(actions), ["preflight"]);
    assert.match(actions[0].reason, /closed.*fix: reopen/);
  });
});
