import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { runCase } from "./harness.ts";

type Verdict = { head: string; spec: "pass" | "fail"; quality: "pass" | "fail" };
// red: earlier heads of the pull request whose checks failed; rebased: failing heads a force push replaced;
// forged: the revisions of a verdict comment an outside author posted before the real one; repo and base default to
// acme/app and the integration branch; outsider: the pull request was opened by an author spp does not trust.
type PrSpec = { n: number; state?: "OPEN" | "MERGED" | "CLOSED"; repo?: string; base?: string; head?: string; verdict?: Verdict; checks?: string; history?: Verdict[]; red?: string[]; rebased?: string[]; forged?: Verdict[]; outsider?: boolean; body?: string };
type Spec = { n: number; closed?: boolean; labels?: string[]; assignees?: string[]; blockedBy?: number[]; pr?: PrSpec; worker?: string; files?: string[]; extraPrs?: PrSpec[] };
type Opts = {
  branch?: string | null;
  panel?: string;
  mainPr?: { state: "OPEN" | "MERGED" | "CLOSED"; lines: number } | null;
  agents?: unknown[];
  env?: Record<string, string>;
  epicState?: string;
  driver?: string;
  fixes?: PrSpec[]; // open or merged pull requests into the integration branch that close no Sub-issue
};
type Action = { kind: string; tickets?: string[]; pr?: string; driver?: string; panel?: boolean; reason: string };

const ISSUE = "https://github.com/acme/app/issues/";
const PULL = "https://github.com/acme/app/pull/";
const HEAD = "a".repeat(40);
const READY = ["ready-for-agent", "size:S"];
const COMMENTS = "api repos/{owner}/{repo}/issues/197/comments --paginate --jq .[] | [.id, .body, .user.login, .author_association] | @json";
const SNAPSHOT = "api graphql -f query=Snapshot -F owner={owner} -F repo={repo} -F number=197";

const trailer = (marker: string, data: unknown) => `${marker}\nrendered\n<!-- sdd-data: ${Buffer.from(JSON.stringify(data)).toString("base64")} -->`;
const verdictBody = (v: Verdict) => trailer("<!-- spp-verdict -->", { ticket: "x", ...v });
// A comment by the repository owner, or by an outside author when `outsider`.
const by = (body: string, outsider = false) => ({ body, author: { login: outsider ? "mallory" : "maint" }, authorAssociation: outsider ? "NONE" : "OWNER" });
const ticketBody = (t: Spec) => `## Files owned\n\n- Modify: ${(t.files ?? [`src/f${t.n}.ts`]).map((f) => `\`${f}\``).join(", ")}\n\n## Interfaces\n\n- Consumes: none\n- Produces: none\n`;

// A case directory for Epic 197 in acme/app: its Sub-issues, their pull requests, CI and verdict history,
// the pull request to the base branch, the Routing block and the claude session list.
function scratch(tickets: Spec[], o: Opts = {}): string {
  const dir = mkdtempSync(join(tmpdir(), "spp-next-"));
  const branch = o.branch === undefined ? "feat/epic" : o.branch;
  const plan = trailer("<!-- sdd-plan -->", { ...(branch ? { branch } : {}), ...(o.driver ? { driver: o.driver } : {}) });
  const pr = (p: PrSpec) => ({
    number: p.n,
    url: p.repo ? `https://github.com/${p.repo}/pull/${p.n}` : PULL + p.n,
    state: p.state ?? "OPEN",
    headRefOid: p.head ?? HEAD,
    baseRefName: p.base ?? branch ?? "main",
    repository: { nameWithOwner: p.repo ?? "acme/app" },
    author: { login: p.outsider ? "mallory" : "maint" },
    authorAssociation: p.outsider ? "NONE" : "OWNER",
    body: p.body ?? "",
    comments: { nodes: [...(p.forged ? [by(verdictBody(p.forged.at(-1)!), true)] : []), ...(p.verdict ? [by(verdictBody(p.verdict))] : [])] },
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
    comments: { nodes: t.worker ? [by(trailer("<!-- sdd-progress -->", { worker: t.worker }))] : [] },
    closedByPullRequestsReferences: { nodes: [...(t.pr ? [pr(t.pr)] : []), ...(t.extraPrs ?? []).map(pr)] },
    timelineItems: { nodes: [] },
  });
  const gh: Record<string, unknown> = {
    "--version": { stdout: "gh version 2.95.0 (2026-06-01)\n" },
    "issue view 197 --json state,subIssuesSummary": { stdout: { state: o.epicState ?? "OPEN", subIssuesSummary: { total: tickets.length } } },
    [COMMENTS]: { stdout: JSON.stringify([1, plan, "maint", "OWNER"]) + "\n" },
    [SNAPSHOT]: {
      stdout: {
        data: {
          viewer: { login: "maint" },
          repository: {
            issue: {
              number: 197,
              url: ISSUE + 197,
              title: "Epic",
              repository: { nameWithOwner: "acme/app" },
              comments: { nodes: [by(plan)] },
              subIssues: { nodes: tickets.map(node) },
            },
          },
        },
      },
    },
  };
  const stubs = (p: PrSpec) => {
    gh[`pr checks ${PULL}${p.n} --json name,bucket`] = { stdout: [{ name: "test", bucket: p.checks ?? "pass" }] };
    const history = p.history ?? (p.verdict ? [p.verdict] : []);
    const [current, ...older] = [...history].reverse();
    const revisions = (vs: Verdict[]) => ({ userContentEdits: { nodes: vs.map((v) => ({ diff: verdictBody(v) })) } });
    const forged = p.forged ? [{ ...by(verdictBody(p.forged.at(-1)!), true), ...revisions([...p.forged].reverse()) }] : [];
    gh[`api graphql -f query=VerdictHistory -f owner=acme -f repo=app -F number=${p.n}`] = {
      stdout: {
        data: {
          viewer: { login: "maint" },
          repository: {
            pullRequest: {
              comments: { nodes: [...forged, ...(current ? [{ ...by(verdictBody(current)), ...revisions([current, ...older]) }] : [])] },
              commits: {
                nodes: [
                  ...(p.red ?? []).map((oid) => ({ commit: { oid, statusCheckRollup: { state: "FAILURE" } } })),
                  { commit: { oid: p.head ?? HEAD, statusCheckRollup: { state: p.checks === "fail" ? "FAILURE" : "SUCCESS" } } },
                ],
              },
              timelineItems: { nodes: (p.rebased ?? []).map((oid) => ({ beforeCommit: { oid, statusCheckRollup: { state: "FAILURE" } } })) },
            },
          },
        },
      },
    };
  };
  for (const t of tickets) {
    gh[`issue view ${ISSUE}${t.n} --json body`] = { stdout: { body: ticketBody(t) } };
    if (t.pr) stubs(t.pr);
  }
  for (const f of o.fixes ?? []) stubs(f);
  if (branch) {
    const m = o.mainPr;
    const prs = m ? [{ number: 900, url: PULL + 900, state: m.state, additions: m.lines - 10, deletions: 10 }] : [];
    gh[`pr list -R acme/app --head ${branch} --state all --json number,url,state,additions,deletions`] = { stdout: prs };
  }
  gh["api graphql -f query=PullRequests *"] = { stdout: { data: { viewer: { login: "maint" }, repository: { pullRequests: { nodes: (o.fixes ?? []).map(pr) } } } } };
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
  test("dispatch names the driver the plan comment records, desktop included, with the socket unset", async () => {
    const actions = await next([{ n: 12 }], { driver: "desktop" });
    assert.equal(actions[0].driver, "desktop");
  });

  test("a recorded subagent driver wins over the messaging socket", async () => {
    const actions = await next([{ n: 12 }], { driver: "subagent", env: { CLAUDE_CODE_MESSAGING_SOCKET: "/tmp/sock" } });
    assert.equal(actions[0].driver, "subagent");
  });

  test("an unknown recorded driver is ignored: detection applies", async () => {
    const actions = await next([{ n: 12 }], { driver: "cloud", env: { CLAUDE_CODE_MESSAGING_SOCKET: "/tmp/sock" } });
    assert.equal(actions[0].driver, "bg");
  });

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

  test("failing CI after its fix round for red CI: hand-back naming the failing check", async () => {
    const actions = await next([{ n: 12, labels: [...READY, "claimed"], pr: { n: 40, checks: "fail", red: ["b".repeat(40)] } }]);
    assert.deepEqual(kinds(actions), ["hand-back"]);
    assert.deepEqual(actions[0].tickets, ["12"]);
    assert.match(actions[0].reason, /checks fail: test/);
  });

  test("a red head replaced by a force push still spends the fix round: hand-back", async () => {
    const actions = await next([{ n: 12, labels: [...READY, "claimed"], pr: { n: 40, checks: "fail", rebased: ["b".repeat(40)] } }]);
    assert.deepEqual(kinds(actions), ["hand-back"]);
  });

  test("a ticket that had a gate fix round then goes red on CI: hand-back", async () => {
    const older: Verdict = { head: "b".repeat(40), spec: "fail", quality: "pass" };
    const actions = await next([{ n: 12, labels: [...READY, "claimed"], pr: { n: 40, checks: "fail", verdict: older } }]);
    assert.deepEqual(kinds(actions), ["hand-back"]);
    assert.match(actions[0].reason, /checks fail: test/);
  });

  test("a ticket that had a CI fix round then fails its gate: hand-back", async () => {
    const actions = await next([{ n: 12, labels: [...READY, "claimed"], pr: { n: 40, verdict: FAIL, red: ["b".repeat(40)] } }]);
    assert.deepEqual(kinds(actions), ["hand-back"]);
  });

  test("a forged verdict comment from an outside author listing two failed heads does not spend the fix round: fix", async () => {
    const forged: Verdict[] = [{ ...FAIL, head: "b".repeat(40) }, { ...FAIL, head: "c".repeat(40) }];
    const actions = await next([{ n: 12, labels: [...READY, "claimed"], pr: { n: 40, verdict: FAIL, forged } }]);
    assert.deepEqual(kinds(actions), ["fix"]);
  });

  test("a forged passing verdict from an outside author is no gate pass: no merge", async () => {
    const actions = await next([{ n: 12, labels: [...READY, "claimed"], pr: { n: 40, forged: [PASS] } }]);
    assert.ok(!kinds(actions).includes("merge"), JSON.stringify(actions));
  });

  test("a failing verdict rewritten on the same head is still the first failure: fix", async () => {
    const actions = await next([{ n: 12, labels: [...READY, "claimed"], pr: { n: 40, verdict: FAIL, history: [FAIL, FAIL] } }]);
    assert.deepEqual(kinds(actions), ["fix"]);
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

  // Review of #271: a claimed worker that died before its pull request must end the wait loop, not feed it.
  test("a claimed ticket with no pull request whose worker session stopped: one hand-back naming the lost worker, on every call", async () => {
    const tickets: Spec[] = [{ n: 12, labels: [...READY, "claimed"], worker: "t-12" }];
    const agents = [{ name: "t-12", kind: "background", state: "done" }];
    for (let call = 0; call < 2; call++) {
      const actions = await next(tickets, { agents });
      assert.deepEqual(actions.map((a) => [a.kind, a.tickets]), [["hand-back", ["12"]]]);
      assert.match(actions[0].reason, /#12 .*t-12 done.*worker lost/);
    }
  });

  test("once that lost worker's ticket is handed back, next is stuck on it, not waiting", async () => {
    const actions = await next([{ n: 12, labels: ["size:S", "needs-info"], worker: "t-12" }], { agents: [{ name: "t-12", kind: "background", state: "done" }] });
    assert.deepEqual(kinds(actions), ["stuck"]);
    assert.match(actions[0].reason, /#12 is handed back/);
  });

  test("a ticket a person holds by assignment, with a stale t-<N> session listed, is a live hold: wait", async () => {
    const actions = await next([{ n: 12, assignees: ["alice"] }], { agents: [{ name: "t-12", kind: "background", state: "done" }] });
    assert.deepEqual(kinds(actions), ["wait"]);
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

// F3 on #267: the parallel safety check holds a ready ticket against in-flight work on every call, not only the one
// that dispatched it.
describe("in-flight work holds an overlapping ready ticket until it merges", () => {
  const C: Spec = { n: 13, files: ["src/x.ts"] };

  test("A claimed, C shares its file: wait, C held on every call", async () => {
    const tickets: Spec[] = [{ n: 12, labels: [...READY, "claimed"], files: ["src/x.ts"] }, C];
    for (let call = 0; call < 2; call++) {
      const actions = await next(tickets);
      assert.deepEqual(kinds(actions), ["wait"]);
      assert.match(actions[0].reason, /#13 held: shares src\/x\.ts with 12/);
    }
  });

  test("A dispatched with its session live but not yet claimed: C held", async () => {
    const actions = await next([{ n: 12, files: ["src/x.ts"] }, C], { agents: [{ name: "t-12", kind: "background", state: "working" }] });
    assert.deepEqual(kinds(actions), ["wait"]);
    assert.match(actions[0].reason, /#13 held: shares src\/x\.ts with 12/);
  });

  test("A with its pull request open: C held", async () => {
    const actions = await next([{ n: 12, labels: [...READY, "claimed"], files: ["src/x.ts"], pr: { n: 40, checks: "pending" } }, C]);
    assert.deepEqual(kinds(actions), ["wait"]);
    assert.match(actions[0].reason, /#13 held: shares src\/x\.ts with 12/);
  });

  test("A merged: C dispatched", async () => {
    const actions = await next([{ ...merged(12), files: ["src/x.ts"] }, C]);
    assert.deepEqual(actions.map((a) => [a.kind, a.tickets]), [["dispatch", ["13"]]]);
  });

  test("an in-flight ticket that touches other files holds nothing", async () => {
    const actions = await next([{ n: 12, labels: [...READY, "claimed"], files: ["src/y.ts"] }, C]);
    assert.deepEqual(actions.map((a) => [a.kind, a.tickets]), [["dispatch", ["13"]]]);
  });
});

describe("hand-backs and merged blockers (F5, F6 on #267)", () => {
  const stateOf = async (tickets: Spec[], n: number) =>
    ((await runCase("status", scratch(tickets))).json as { tickets: { number: number; state: string }[] }).tickets.find((t) => t.number === n)?.state;

  test("a hand-back with --blocked-by whose blocker closed is ready again: dispatch", async () => {
    const tickets: Spec[] = [merged(11), { n: 12, labels: [...READY, "blocked"], blockedBy: [11] }];
    const actions = await next(tickets);
    assert.deepEqual(actions.map((a) => [a.kind, a.tickets]), [["dispatch", ["12"]]]);
    assert.equal(await stateOf(tickets, 12), "ready");
  });

  test("a hand-back with --blocked-by whose blocker is still open is blocked, not handed back", async () => {
    assert.equal(await stateOf([{ n: 11 }, { n: 12, labels: [...READY, "blocked"], blockedBy: [11] }], 12), "blocked");
  });

  test("an unnamed-blocker hand-back (blocked, no ready-for-agent) stays handed back", async () => {
    assert.equal(await stateOf([{ n: 12, labels: ["size:S", "blocked"] }], 12), "handed-back");
  });

  test("a blocker whose pull request merged while its issue stays open no longer blocks: dispatch", async () => {
    const tickets: Spec[] = [{ n: 11, labels: [...READY, "claimed"], pr: { n: 111, state: "MERGED" } }, { n: 12, blockedBy: [11] }];
    const actions = await next(tickets);
    assert.deepEqual(actions.map((a) => [a.kind, a.tickets]), [["dispatch", ["12"]]]);
    assert.equal(await stateOf(tickets, 12), "ready");
  });
});

// Review of #271: derive's blockers and planNext read one rule for a landed ticket, the pull request it shows.
describe("one rule for a landed blocker", () => {
  test("a blocker with a merged pull request and a newer open one is not done: its dependant stays blocked, and its open PR is gated", async () => {
    const tickets: Spec[] = [
      { n: 11, labels: [...READY, "claimed"], pr: { n: 112 }, extraPrs: [{ n: 111, state: "MERGED" }] },
      { n: 12, blockedBy: [11] },
    ];
    const actions = await next(tickets);
    assert.deepEqual(actions.map((a) => [a.kind, a.tickets]), [["gate", ["11"]]]);
    const s = (await runCase("status", scratch(tickets))).json as { tickets: { number: number; state: string }[] };
    assert.equal(s.tickets.find((t) => t.number === 12)?.state, "blocked");
  });

  // F26 (Round 2) on #267: only a pull request merged into the integration branch, in one of the Epic's repositories,
  // lands its ticket.
  for (const [what, foreign] of [
    ["from a repository outside the Epic", { repo: "mallory/fork" }],
    ["into a branch other than the integration branch", { base: "main" }],
  ] as const) {
    test(`a blocker whose only merged pull request is ${what} has not landed: its dependant stays blocked`, async () => {
      const tickets: Spec[] = [{ n: 11, pr: { n: 111, state: "MERGED", ...foreign } }, { n: 12, blockedBy: [11] }];
      const actions = await next(tickets);
      assert.deepEqual(actions.map((a) => [a.kind, a.tickets]), [["dispatch", ["11"]]]);
      const s = (await runCase("status", scratch(tickets))).json as { tickets: { number: number; state: string }[] };
      assert.equal(s.tickets.find((t) => t.number === 12)?.state, "blocked");
    });
  }

  test("a blocker whose real merge into the integration branch sits beside a foreign merged pull request with a higher number has landed: dispatch its dependant", async () => {
    const tickets: Spec[] = [
      { n: 11, labels: [...READY, "claimed"], pr: { n: 111, state: "MERGED" }, extraPrs: [{ n: 999, state: "MERGED", repo: "mallory/fork" }] },
      { n: 12, blockedBy: [11] },
    ];
    const actions = await next(tickets);
    assert.deepEqual(actions.map((a) => [a.kind, a.tickets]), [["dispatch", ["12"]]]);
  });
});

// F39 (Round 3) on #267: a pull request outside the Epic's repositories, an open one into another base, or one an
// untrusted author opened is no PR of the ticket for any reader, so a stranger can never reach the gate or the merge.
describe("one set of pull requests for every reader", () => {
  const status = async (tickets: Spec[], o: Opts = {}) =>
    ((await runCase("status", scratch(tickets, o))).json as { tickets: { number: number; state: string; pr: { url: string } | null }[] }).tickets;

  for (const [what, foreign] of [
    ["in a repository outside the Epic", { repo: "mallory/fork" }],
    ["into a branch other than the integration branch", { base: "main" }],
    ["from an author spp does not trust (a fork pull request into the Epic's repository)", { outsider: true }],
  ] as const) {
    test(`an open pull request ${what} leaves a ready ticket ready: dispatched, never gated`, async () => {
      const tickets: Spec[] = [{ n: 12, pr: { n: 999, ...foreign } }];
      assert.deepEqual((await next(tickets)).map((a) => [a.kind, a.tickets]), [["dispatch", ["12"]]]);
      assert.deepEqual((await status(tickets)).map((t) => [t.state, t.pr]), [["ready", null]]);
    });
  }

  test("a foreign open pull request beside the ticket's own gate-passed one: the merge targets its own", async () => {
    const tickets: Spec[] = [{ n: 12, labels: [...READY, "claimed"], pr: { n: 40, verdict: PASS }, extraPrs: [{ n: 999, repo: "mallory/fork" }] }];
    const actions = await next(tickets);
    assert.deepEqual(actions.map((a) => [a.kind, a.pr]), [["merge", PULL + 40]]);
  });

  // F43 (Round 3) on #267.
  test("with no integration branch recorded, a merged pull request lands nothing: its dependant stays blocked", async () => {
    const tickets: Spec[] = [{ n: 11, pr: { n: 111, state: "MERGED", base: "feat/epic" } }, { n: 12, blockedBy: [11] }];
    const s = await status(tickets, { branch: null });
    assert.equal(s.find((t) => t.number === 12)?.state, "blocked");
  });
});

describe("fix pull requests", () => {
  const FIX = (n: number, extra: Partial<PrSpec> = {}, ticket = 12): PrSpec => ({ n, body: `Refs #${ticket}`, ...extra });
  const landed = [merged(12)];
  const WHY = (a: Action) => a.reason;

  test("every ticket landed, one open attributed fix, checks pass, no verdict: gate for it and no main-gate", async () => {
    const actions = await next(landed, { fixes: [FIX(77)], mainPr: null });
    assert.deepEqual(actions, [{ kind: "gate", tickets: ["12"], pr: PULL + 77, reason: actions[0].reason }]);
  });

  test("a trusted passing verdict on its head: merge", async () => {
    const actions = await next(landed, { fixes: [FIX(77, { verdict: PASS })] });
    assert.deepEqual(actions.map((a) => [a.kind, a.pr, a.tickets]), [["merge", PULL + 77, ["12"]]]);
  });

  test("a passing verdict on an older head leaves it ungated: gate", async () => {
    const actions = await next(landed, { fixes: [FIX(77, { verdict: { ...PASS, head: "c".repeat(40) } })] });
    assert.deepEqual(kinds(actions), ["gate"]);
  });

  test("its head failed its gate once: fix", async () => {
    const actions = await next(landed, { fixes: [FIX(77, { verdict: FAIL })] });
    assert.deepEqual(actions.map((a) => [a.kind, a.pr]), [["fix", PULL + 77]]);
  });

  test("failing checks: fix, naming the failing runs", async () => {
    const actions = await next(landed, { fixes: [FIX(77, { checks: "fail" })] });
    assert.deepEqual(kinds(actions), ["fix"]);
    assert.match(WHY(actions[0]), /checks fail: test/);
  });

  test("two failed heads: hand-back naming the pull request, ending with the person's decision", async () => {
    const actions = await next(landed, { fixes: [FIX(77, { verdict: FAIL, red: ["b".repeat(40)] })] });
    assert.deepEqual(actions.map((a) => [a.kind, a.pr]), [["hand-back", PULL + 77]]);
    assert.match(WHY(actions[0]), /#77/);
    assert.match(WHY(actions[0]), /the decision is a person's, and no Sub-issue is relabelled$/);
  });

  test("checks pending: wait", async () => {
    const actions = await next(landed, { fixes: [FIX(77, { checks: "pending" })] });
    assert.deepEqual(kinds(actions), ["wait"]);
    assert.match(WHY(actions[0]), /#77 checks pending/);
  });

  test("its Sub-issue's worker still running: wait, not gate", async () => {
    const agents = [{ name: "t-12", state: "working" }];
    assert.deepEqual(kinds(await next(landed, { fixes: [FIX(77)], agents })), ["wait"]);
  });

  test("an unattributed fix with nothing else in flight: stuck, naming it, Refs and the other way out", async () => {
    const actions = await next(landed, { fixes: [{ n: 79 }] });
    assert.deepEqual(kinds(actions), ["stuck"]);
    assert.match(WHY(actions[0]), /#79/);
    assert.match(WHY(actions[0]), /Refs #<Sub-issue>/);
    assert.match(WHY(actions[0]), /close it/);
    assert.doesNotMatch(WHY(actions[0]), /Closes/);
  });

  test("an unattributed fix beside a gated one: the gate action, the unattributed one named in its reason", async () => {
    const actions = await next(landed, { fixes: [FIX(77), { n: 79 }] });
    assert.deepEqual(kinds(actions), ["gate"]);
    assert.match(WHY(actions[0]), /#79/);
  });

  test("an unattributed fix beside work in flight: wait lists it", async () => {
    const actions = await next([{ n: 13, labels: [...READY, "claimed"] }], { fixes: [{ n: 79 }] });
    assert.deepEqual(kinds(actions), ["wait"]);
    assert.match(WHY(actions[0]), /#79/);
  });

  test("every ticket landed, one merged fix and no open one: main-gate", async () => {
    const actions = await next(landed, { fixes: [FIX(77, { state: "MERGED" })], mainPr: null });
    assert.deepEqual(kinds(actions), ["main-gate"]);
  });

  test("the pull request to the base branch merged while a fix is open: close, as before", async () => {
    const actions = await next(landed, { fixes: [FIX(77)], mainPr: { state: "MERGED", lines: 50 } });
    assert.deepEqual(kinds(actions), ["close"]);
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
