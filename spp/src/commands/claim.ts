// spp claim <issue>: sets the Claim mark, the `claimed` label (ADR 0006).
import { runGh } from "../gh.ts";
import { guarded, parseIssue, UsageError } from "../markers.ts";

const USAGE = "usage: spp claim <issue>\n<issue> is an issue number in the current repo or a GitHub issue URL.\n";

export function run(args: string[]): Promise<number> {
  return guarded(() => "claim", USAGE, async () => {
    if (args.length > 1) throw new UsageError("claim takes only <issue>");
    const issue = parseIssue(args[0]);
    // Adding a label the repo lacks fails, so create it idempotently first.
    await runGh(["label", "create", "claimed", "--color", "FBCA04", "--description", "Held by a worker; set before work, cleared on stopping without a PR", "--force", ...issue.repoFlag]);
    await runGh(["issue", "edit", issue.arg, "--add-label", "claimed"]);
  });
}
