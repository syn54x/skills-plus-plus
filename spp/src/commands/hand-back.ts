// spp hand-back <issue> <route> --reason TEXT [--blocked-by <issue>]: returns a Sub-issue to a person or a queue.
// Why first, then the route, then the claim is released: a failure part-way leaves the ticket held, never released
// without a route, and a re-run of the same call finishes it.
import { runGh } from "../gh.ts";
import { flagPairs, guarded, parseIssue, print, TrailerError, UsageError } from "../markers.ts";
import { saveProgress } from "./progress.ts";

const USAGE = `usage: spp hand-back <issue> needs-info|ready-for-human|blocked --reason TEXT [--blocked-by <issue>]
--blocked-by goes only with the blocked route, where it adds the blocked-by edge and keeps ready-for-agent;
every other hand-back, blocked without --blocked-by included, removes ready-for-agent.
`;

const ROUTES = ["needs-info", "ready-for-human", "blocked"];

export function run(args: string[]): Promise<number> {
  return guarded(() => "hand-back", USAGE, async () => {
    const [arg, route, ...rest] = args;
    const issue = parseIssue(arg);
    if (!ROUTES.includes(route)) throw new UsageError("hand-back needs a route: needs-info, ready-for-human or blocked");
    const flags = Object.fromEntries(flagPairs(rest, ["--reason", "--blocked-by"], "hand-back: "));
    const reason = flags["--reason"] ?? "";
    const blockedBy = flags["--blocked-by"] ?? "";
    if (!reason) throw new UsageError("hand-back needs --reason");
    if (blockedBy && route !== "blocked") throw new UsageError("--blocked-by goes only with the blocked route");

    const steps: [string, () => Promise<unknown>][] = [
      ["1 (progress comment)", async () => print(await saveProgress(issue.arg, { status: "handed-back", route, reason }))],
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
  });
}
