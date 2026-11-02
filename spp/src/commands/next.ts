// spp next <epic> [--json]: the build's next actions. The build loop is: run spp next, do what it says, repeat.
import { spawnSync } from "node:child_process";
import { runGh } from "../gh.ts";
import { guarded, parseIssue, readTrailer, UsageError } from "../markers.ts";
import { type Action, liveWorker, planNext, type Session } from "../plan-next.ts";
import { VERDICT_MARKER } from "../snapshot.ts";
import { culprits, readChecks } from "./checks.ts";
import { Failure, preflight } from "./preflight.ts";
import { fetchState } from "./status.ts";
import { wavePlan } from "./wave.ts";

const USAGE = `usage: spp next <epic number | issue URL> [--json]
Prints the next actions: preflight, branch, dispatch, gate, fix, hand-back, merge, wait, main-gate, close or stuck.
`;

const PULL_URL = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)$/;

// Every revision of a pull request's verdict comment, so the fix rounds come from GitHub and never from local state.
// shortcut: the first 30 comments and 100 edits, as the snapshot reads verdicts; raise them if a verdict is ever missed.
const VERDICT_HISTORY = `query VerdictHistory($owner: String!, $repo: String!, $number: Int!) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $number) { comments(first: 30) { nodes { body userContentEdits(first: 100) { nodes { diff } } } } }
  }
}`;

// The sessions `claude agents` lists; none when claude is missing or fails, since the session list is only a hint.
export function readSessions(): Session[] {
  const r = spawnSync("claude", ["agents", "--json", "--all"], { encoding: "utf8" });
  try {
    return r.status === 0 ? (JSON.parse(r.stdout) as Session[]) : [];
  } catch {
    return [];
  }
}

// How many different heads a verdict failed on: 1 is the first failure, 2 or more means the fix round is spent.
async function failedHeads(pr: string): Promise<number> {
  const [, owner, repo, number] = PULL_URL.exec(pr) ?? [];
  if (!number) return 1;
  type Comment = { body: string; userContentEdits: { nodes: { diff: string | null }[] } };
  const out = JSON.parse(await runGh(["api", "graphql", "-f", `query=${VERDICT_HISTORY}`, "-f", `owner=${owner}`, "-f", `repo=${repo}`, "-F", `number=${number}`]));
  const comment = (out.data.repository.pullRequest.comments.nodes as Comment[]).find((c) => c.body.startsWith(VERDICT_MARKER));
  const heads = new Set<string>();
  for (const body of [comment?.body ?? "", ...(comment?.userContentEdits.nodes ?? []).map((e) => e.diff ?? "")]) {
    const v = readTrailer(body);
    if (v && (v.spec === "fail" || v.quality === "fail") && typeof v.head === "string") heads.add(v.head.slice(0, 7));
  }
  return heads.size;
}

async function actions(arg: string): Promise<Action[]> {
  const epic = parseIssue(arg);
  let panel;
  try {
    panel = (await preflight(epic)).routing.panel;
  } catch (e) {
    if (!(e instanceof Failure)) throw e;
    return [{ kind: "preflight", reason: `${e.message}; fix: ${e.fix}` }];
  }
  const state = (await fetchState(epic.arg))!;
  const branch = state.epic.branch;
  if (!branch) return [{ kind: "branch", reason: `epic ${epic.label} has no integration branch; run spp branch ${epic.arg}` }];

  const sessions = readSessions();
  const dispatchable = state.tickets.filter((t) => !(t.state === "ready" && liveWorker(t, sessions)));
  const prs = (st: string) => state.tickets.flatMap((t) => (t.pr && t.state === st ? [t.pr.url] : []));
  const [wave, checks, heads, list] = await Promise.all([
    wavePlan({ ...state, tickets: dispatchable }, 4),
    Promise.all(prs("pr-open").map(async (pr) => [pr, await readChecks(pr)] as const)),
    Promise.all(prs("gate-fail").map(async (pr) => [pr, await failedHeads(pr)] as const)),
    runGh(["pr", "list", "-R", state.epic.repo, "--head", branch, "--state", "all", "--json", "number,url,state,additions,deletions"]),
  ]);
  type MainPr = { url: string; state: "OPEN" | "MERGED" | "CLOSED"; additions: number; deletions: number };
  const main = (JSON.parse(list) as MainPr[]).sort((a, b) => Number(b.state === "MERGED") - Number(a.state === "MERGED") || Number(b.state === "OPEN") - Number(a.state === "OPEN"))[0];
  return planNext({
    state,
    panel,
    driver: process.env.CLAUDE_CODE_MESSAGING_SOCKET ? "bg" : "subagent",
    sessions,
    wave,
    checks: Object.fromEntries(checks.map(([pr, c]) => [pr, { result: c.result, failing: culprits(c) }])),
    failedHeads: Object.fromEntries(heads),
    mainPr: main ? { url: main.url, state: main.state, lines: main.additions + main.deletions } : null,
  });
}

export function run(args: string[]): Promise<number> {
  return guarded(() => "next", USAGE, async () => {
    const rest = args.filter((a) => a !== "--json");
    if (rest.length !== 1) throw new UsageError("");
    const list = await actions(rest[0]);
    process.stdout.write(
      args.includes("--json")
        ? JSON.stringify({ actions: list }, null, 2) + "\n"
        : list.map((a) => `${a.kind}${a.tickets ? ` ${a.tickets.join(", ")}` : ""}${a.pr ? ` ${a.pr}` : ""}: ${a.reason}\n`).join(""),
    );
  });
}
