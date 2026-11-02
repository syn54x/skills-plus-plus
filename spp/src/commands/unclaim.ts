/**
 * `spp unclaim <issue>` clears the Claim mark: it removes the `claimed` label and prints nothing. A worker that stops
 * without a pull request hands the ticket back with `spp hand-back` instead, which also records why.
 *
 * @module
 */
import { runGh } from "../gh.ts";
import { guarded, parseIssue, UsageError } from "../markers.ts";

/** The usage text `spp unclaim --help` prints. */
export const USAGE = "usage: spp unclaim <issue>\n<issue> is an issue number in the current repo or a GitHub issue URL.\n";

/**
 * Removes the Claim mark from an issue.
 *
 * @param args - The issue: a number in the current repo or a GitHub issue URL.
 * @returns 0 when the label is off the issue; 2 on a usage error, with the usage on stderr; 1 when `gh` fails, with
 *   the reason on stderr.
 * @example
 * ```bash
 * spp unclaim 265
 * ```
 */
export function run(args: string[]): Promise<number> {
  return guarded(() => "unclaim", USAGE, async () => {
    if (args.length > 1) throw new UsageError("unclaim takes only <issue>");
    await runGh(["issue", "edit", parseIssue(args[0]).arg, "--remove-label", "claimed"]);
  });
}
