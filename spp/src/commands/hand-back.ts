/**
 * `spp hand-back <issue> needs-info|ready-for-human|blocked --reason TEXT [--blocked-by <issue>]` returns a Sub-issue
 * to a person or a queue in one call. It writes in this order: the progress comment (status `handed-back` with the
 * route and reason), then the route label, then removes the Claim mark, so a failure part-way leaves the ticket held,
 * never released without a route, and running the same call again finishes it. `--blocked-by` goes only with
 * `blocked`, where it adds the blocked-by edge and keeps `ready-for-agent`; every other Hand-back removes
 * `ready-for-agent`. `--by "<skill> <step>"` names the progress write's maker in its trailer's `by` (implement-issue
 * when absent). It prints the progress comment's URL and has no `--json`.
 *
 * Each Hand-back also records a Signal: `needs-info` a `brief-gap` and `blocked` a `missed-edge`, both charged to the
 * maker of the Verify pin (harden when it names none), and `ready-for-human` a `human-needed`, charged to the maker of
 * the progress comment before this write (implement-issue when it names none). A reason starting `worker lost`
 * records none. It records nothing under `CI`, outside an Attended session, or when the Self-improvement mode is Off, and a failure
 * while recording is one `signal not recorded:` line on stderr that leaves the exit code as it was.
 *
 * Last, it deletes the attended decision `spp dispatch` passed down for this ticket, so no later run in the worker's
 * checkout inherits it.
 *
 * @module
 */
import { forgetDecision } from "../attended.ts";
import { handBackCorrection, trailerBefore } from "../corrections.ts";
import { runGh } from "../gh.ts";
import { flagPairs, guarded, parseBy, parseIssue, print, TrailerError, UsageError } from "../markers.ts";
import { currentRepo } from "../notes.ts";
import { saveProgress } from "./progress.ts";

/** The usage text `spp hand-back --help` prints. */
export const USAGE = `usage: spp hand-back <issue> needs-info|ready-for-human|blocked --reason TEXT [--blocked-by <issue>]
                            [--by "<skill> <step>"]
--blocked-by goes only with the blocked route, where it adds the blocked-by edge and keeps ready-for-agent;
every other hand-back, blocked without --blocked-by included, removes ready-for-agent.
--by records the progress write as that skill's (default implement-issue), the rest of the value as its step.
`;

const ROUTES = ["needs-info", "ready-for-human", "blocked"];

/**
 * Hands a Sub-issue back along one route.
 *
 * @param args - The issue (a number in the current repo or a GitHub issue URL), the route, `--reason TEXT`, and
 *   with the `blocked` route `--blocked-by <issue>` when the blocker is known.
 * @returns 0 when all three steps are done; 2 on a usage error, with the usage on stderr; 1 when a step fails, with
 *   `step <n> (<what>) failed; re-run to finish` on stderr, or when the progress comment's trailer does not decode.
 * @example
 * ```bash
 * spp hand-back 265 needs-info --reason "the ticket cites src/tax.ts, which does not exist"
 * spp hand-back 265 blocked --reason "needs the auth route" --blocked-by 240
 * ```
 */
export function run(args: string[]): Promise<number> {
  return guarded(() => "hand-back", USAGE, async () => {
    const [arg, route, ...rest] = args;
    const issue = parseIssue(arg);
    if (!ROUTES.includes(route)) throw new UsageError("hand-back needs a route: needs-info, ready-for-human or blocked");
    const flags = Object.fromEntries(flagPairs(rest, ["--reason", "--blocked-by", "--by"], "hand-back: "));
    const by = flags["--by"] === undefined ? undefined : parseBy(flags["--by"]);
    const reason = flags["--reason"] ?? "";
    const blockedBy = flags["--blocked-by"] ?? "";
    if (!reason) throw new UsageError("hand-back needs --reason");
    if (blockedBy && route !== "blocked") throw new UsageError("--blocked-by goes only with the blocked route");

    const before = await trailerBefore("hand-back", issue.arg, route, reason);
    const steps: [string, () => Promise<unknown>][] = [
      ["1 (progress comment)", async () => print(await saveProgress(issue.arg, { status: "handed-back", route, reason }, by))],
      // The blocked-by edge keeps the ticket out of the Ready queue, so ready-for-agent stays for when it clears;
      // without an edge the ticket must leave the queue by label.
      ["2 (route labels)", () => runGh(["issue", "edit", issue.arg, ...(blockedBy ? ["--add-label", "blocked", "--add-blocked-by", blockedBy] : ["--add-label", route, "--remove-label", "ready-for-agent"])])],
      ["3 (clear claimed)", () => runGh(["issue", "edit", issue.arg, "--remove-label", "claimed"])],
    ];
    for (const [step, write] of steps) {
      try {
        await write();
      } catch (e) {
        if (e instanceof TrailerError) throw e; // a re-run refuses the same way, so no re-run hint
        process.stderr.write(`spp hand-back: ${e instanceof Error ? e.message : e}\nspp hand-back: step ${step} failed; re-run to finish\n`);
        return 1;
      }
    }
    await handBackCorrection(issue.arg, route, reason, before);
    // The worker is gone, so its passed attended decision goes too (ADR 0012); after the Signal, which still reads it.
    try {
      forgetDecision(process.env, issue.repo === "{owner}/{repo}" ? currentRepo() : issue.repo, Number(issue.number));
    } catch {} // no GitHub origin: there is no decision to find either, and the hand-back itself is done
  });
}
