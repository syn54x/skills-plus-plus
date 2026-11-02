/**
 * `spp claim <issue>` sets the Claim mark: it adds the `claimed` label, creating the label first when the repo lacks
 * it, and prints nothing. The Claim mark is a label and never an assignee (ADR 0006). `spp unclaim` removes it.
 *
 * @module
 */
import { runGh } from "../gh.ts";
import { guarded, parseIssue, UsageError } from "../markers.ts";

/** The usage text `spp claim --help` prints. */
export const USAGE = "usage: spp claim <issue>\n<issue> is an issue number in the current repo or a GitHub issue URL.\n";

/**
 * Adds the Claim mark to an issue.
 *
 * @param args - The issue: a number in the current repo or a GitHub issue URL.
 * @returns 0 when the label is on the issue; 2 on a usage error, with the usage on stderr; 1 when `gh` fails, with
 *   the reason on stderr.
 * @example
 * ```bash
 * spp claim 265
 * ```
 */
export function run(args: string[]): Promise<number> {
  return guarded(() => "claim", USAGE, async () => {
    if (args.length > 1) throw new UsageError("claim takes only <issue>");
    const issue = parseIssue(args[0]);
    // Adding a label the repo lacks fails, so create it idempotently first.
    await runGh(["label", "create", "claimed", "--color", "FBCA04", "--description", "Held by a worker; set before work, cleared on stopping without a PR", "--force", ...issue.repoFlag]);
    await runGh(["issue", "edit", issue.arg, "--add-label", "claimed"]);
  });
}
