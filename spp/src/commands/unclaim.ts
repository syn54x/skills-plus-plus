// spp unclaim <issue>: clears the Claim mark. Stopping without a pull request is a hand-back, not an unclaim.
import { runGh } from "../gh.ts";
import { guarded, parseIssue, UsageError } from "../markers.ts";

export const USAGE = "usage: spp unclaim <issue>\n<issue> is an issue number in the current repo or a GitHub issue URL.\n";

export function run(args: string[]): Promise<number> {
  return guarded(() => "unclaim", USAGE, async () => {
    if (args.length > 1) throw new UsageError("unclaim takes only <issue>");
    await runGh(["issue", "edit", parseIssue(args[0]).arg, "--remove-label", "claimed"]);
  });
}
