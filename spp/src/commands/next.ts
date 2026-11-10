/**
 * `spp next <epic> [--json] [--resume] [--running <tickets>]` prints the build's next actions, one per line. The build loop is: run
 * `spp next`, do what it says, run it again. It reads the Epic's preconditions, its state, CI on open pull requests,
 * the gate's verdict history and the pull request to the base branch from GitHub, never from a session list; the one
 * input that comes from the caller is `--running`. With `--json` it prints {@link NextActions}.
 *
 * `--running` takes the comma-separated tickets (numbers in the Epic's repo, `owner/repo#N` or issue URLs) the build
 * started a worker on, until that worker reports back. spp counts only those still ready: each is in flight, never
 * dispatched again, and a ready ticket that overlaps one is held. Without it nothing is held that way, so a new
 * session, or a restart after `spp unclaim`, dispatches them.
 *
 * With `--resume`, for the first call of a run, a Sub-issue that is claimed, has no open or merged pull request and
 * no assignee comes back as a `hand-back` action with the reason `worker lost`: the session that started its worker
 * is gone, so the user decides whether to hand it back or start a worker again. Without it such a Sub-issue is in
 * flight.
 *
 * @module
 */
import { runGh } from "../gh.ts";
import { guarded, parseIssue, readTrailer, UsageError } from "../markers.ts";
import { type Action, DEFAULT_WAVE_MAX, planNext } from "../plan-next.ts";
import { trustedMarker } from "../snapshot.ts";
import { readVerdict, VERDICT_MARKER } from "../verdict.ts";
import { culprits, readChecks } from "./checks.ts";
import { Failure, preflight } from "./preflight.ts";
import { fetchState } from "./status.ts";
import { runningFlag, runningOf, wavePlan } from "./wave.ts";

export type { Action, ActionKind } from "../plan-next.ts";

/** The build's next actions: the `--json` shape of `spp next`. */
export type NextActions = {
  /** The actions, in the order to take them. */
  actions: Action[];
};

/** The usage text `spp next --help` prints. */
export const USAGE = `usage: spp next <epic number | issue URL> [--json] [--resume] [--running 101,owner/repo#7]
Prints the next actions: preflight, branch, dispatch, gate, fix, hand-back, merge, wait, main-gate, close or stuck.
--resume, on a run's first call, hands back each claimed Sub-issue with no pull request and no assignee as "worker lost".
--running names the tickets the build started a worker on, until that worker reports back; spp counts only those still
ready, as in flight: not dispatched again, and a ready ticket that overlaps one is held.
`;

const PULL_URL = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)$/;

// Every revision of a pull request's verdict comment and the CI result of every head it had (force-pushed ones too),
// so the fix rounds come from GitHub and never from local state. Only a trusted author's verdict comment counts (ADR 0009).
// shortcut: the first 30 comments, 100 edits, last 100 commits and 50 force pushes; raise them if a failure is ever missed.
const VERDICT_HISTORY = `query VerdictHistory($owner: String!, $repo: String!, $number: Int!) {
  viewer { login }
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $number) {
      comments(first: 30) { nodes { body author { login } authorAssociation userContentEdits(first: 100) { nodes { diff } } } }
      commits(last: 100) { nodes { commit { oid statusCheckRollup { state } } } }
      timelineItems(itemTypes: [HEAD_REF_FORCE_PUSHED_EVENT], last: 50) {
        nodes { ... on HeadRefForcePushedEvent { beforeCommit { oid statusCheckRollup { state } } } }
      }
    }
  }
}`;

// How many different heads failed a verdict or CI: 1 is the first failure, 2 or more means the fix round is spent.
// shortcut: every red head counts, so a worker that pushes red and then green inside one round spends the round early.
async function failedHeads(pr: string): Promise<number> {
  const [, owner, repo, number] = PULL_URL.exec(pr) ?? [];
  if (!number) return 1;
  type Comment = { body: string; author: { login: string } | null; authorAssociation: string; userContentEdits: { nodes: { diff: string | null }[] } };
  const out = JSON.parse(await runGh(["api", "graphql", "-f", `query=${VERDICT_HISTORY}`, "-f", `owner=${owner}`, "-f", `repo=${repo}`, "-F", `number=${number}`]));
  const p = out.data.repository.pullRequest;
  const comment = trustedMarker(p.comments.nodes as Comment[], VERDICT_MARKER, out.data.viewer?.login);
  const heads = new Set<string>();
  for (const body of [comment?.body ?? "", ...(comment?.userContentEdits.nodes ?? []).map((e) => e.diff ?? "")]) {
    const v = readVerdict(readTrailer(body));
    if (v && (v.spec === "fail" || v.quality === "fail")) heads.add(v.head.slice(0, 7));
  }
  type Commit = { oid: string; statusCheckRollup: { state: string } | null } | null;
  const commits: Commit[] = [
    ...p.commits.nodes.map((n: { commit: Commit }) => n.commit),
    ...p.timelineItems.nodes.map((n: { beforeCommit?: Commit }) => n.beforeCommit ?? null),
  ];
  for (const c of commits) if (c && ["FAILURE", "ERROR"].includes(c.statusCheckRollup?.state ?? "")) heads.add(c.oid.slice(0, 7));
  return heads.size;
}

async function actions(arg: string, resume: boolean, running: string | undefined): Promise<Action[]> {
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

  const openFixes = state.fixes.filter((f) => f.state === "OPEN");
  const attributed = openFixes.filter((f) => f.ticket); // an unattributed fix is never gated, so its checks are not read
  const prs = (st: string) => state.tickets.flatMap((t) => (t.pr && t.state === st ? [t.pr.url] : []));
  const [wave, checks, list] = await Promise.all([
    wavePlan(state, DEFAULT_WAVE_MAX, runningOf(state, running)),
    Promise.all([...prs("pr-open"), ...attributed.map((f) => f.url)].map(async (pr) => [pr, await readChecks(pr)] as const)),
    runGh(["pr", "list", "-R", state.epic.repo, "--head", branch, "--state", "all", "--json", "number,url,state,additions,deletions"]),
  ]);
  const red = checks.flatMap(([pr, c]) => (c.result === "fail" ? [pr] : []));
  const heads = await Promise.all([...new Set([...prs("gate-fail"), ...attributed.filter((f) => f.gate === "gate-fail").map((f) => f.url), ...red])].map(async (pr) => [pr, await failedHeads(pr)] as const));
  type MainPr = { url: string; state: "OPEN" | "MERGED" | "CLOSED"; additions: number; deletions: number };
  const main = (JSON.parse(list) as MainPr[]).sort((a, b) => Number(b.state === "MERGED") - Number(a.state === "MERGED") || Number(b.state === "OPEN") - Number(a.state === "OPEN"))[0];
  return planNext({
    state,
    panel,
    resume,
    wave,
    checks: Object.fromEntries(checks.map(([pr, c]) => [pr, { result: c.result, failing: culprits(c) }])),
    failedHeads: Object.fromEntries(heads),
    mainPr: main ? { url: main.url, state: main.state, lines: main.additions + main.deletions } : null,
  });
}

/**
 * Prints the build's next actions.
 *
 * @param args - The Epic (an issue number in the current repo or an issue URL), `--json` for the
 *   {@link NextActions} shape, `--resume` to report each lost worker as a `hand-back`, and `--running` with the
 *   tickets the build started a worker on and whose worker has not reported back.
 * @returns 0 when it printed the actions, a failed precondition included (as a `preflight` action); 2 on a usage
 *   error, with the usage on stderr. A `gh` error exits 1 with the reason on stderr.
 * @example
 * ```bash
 * spp next 197
 * spp next 197 --resume --json
 * spp next 197 --json --running 201,202
 * ```
 */
export function run(args: string[]): Promise<number> {
  return guarded(() => "next", USAGE, async () => {
    const running = runningFlag(args);
    const rest = running.rest.filter((a) => a !== "--json" && a !== "--resume");
    if (rest.length !== 1) throw new UsageError("");
    const list: NextActions = { actions: await actions(rest[0], args.includes("--resume"), running.list) };
    process.stdout.write(
      args.includes("--json")
        ? JSON.stringify(list, null, 2) + "\n"
        : list.actions.map((a) => `${a.kind}${a.tickets ? ` ${a.tickets.join(", ")}` : ""}${a.pr ? ` ${a.pr}` : ""}: ${a.reason}\n`).join(""),
    );
  });
}
