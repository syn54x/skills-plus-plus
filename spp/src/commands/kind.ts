/**
 * `spp kind <issue> [--json]` says what an issue is: an Epic (it has Sub-issues), a ticket (it passes
 * `spp lint ticket`) or raw (anything else), and why. `/build` routes on it. Without `--json` the answer is one line,
 * such as `ticket: carries the ticket contract and one size`; with `--json` it prints {@link Kind}.
 *
 * @module
 */
import { runGh } from "../gh.ts";
import { isIssueRef, lintTicket } from "../ticket.ts";

/** What an issue is: the `--json` shape of `spp kind`. */
export type Kind = {
  /** `epic` when it has Sub-issues, `ticket` when it passes the ticket lint, `raw` otherwise. */
  kind: "epic" | "ticket" | "raw";
  /** Why: the Sub-issue count for an Epic, and every lint failure, joined by `; `, for a raw issue. */
  reason: string;
};

/** The usage text `spp kind --help` prints. */
export const USAGE = "usage: spp kind <issue number | issue URL> [--json]\n";

/**
 * Prints what an issue is.
 *
 * @param args - The issue (a number in the current repo or a GitHub issue URL), and `--json` for the {@link Kind}
 *   shape.
 * @returns 0 when it printed the kind; 2 on a usage error, with the usage on stderr. A `gh` error exits 1 with the
 *   reason on stderr.
 * @example
 * ```bash
 * spp kind 227 --json
 * ```
 */
export async function run(args: string[]): Promise<number> {
  const rest = args.filter((a) => a !== "--json");
  if (rest.length !== 1 || !isIssueRef(rest[0])) {
    process.stderr.write(USAGE);
    return 2;
  }
  const issue = JSON.parse(await runGh(["issue", "view", rest[0], "--json", "body,labels,subIssuesSummary"])) as {
    body: string;
    labels: { name: string }[];
    subIssuesSummary: { total: number };
  };
  const failures = lintTicket(issue.body ?? "", issue.labels.map((l) => l.name));
  const result: Kind =
    issue.subIssuesSummary.total > 0
      ? { kind: "epic", reason: `${issue.subIssuesSummary.total} Sub-issues` }
      : failures.length === 0
        ? { kind: "ticket", reason: "carries the ticket contract and one size" }
        : { kind: "raw", reason: failures.map((f) => f.detail).join("; ") };
  process.stdout.write(args.includes("--json") ? JSON.stringify(result, null, 2) + "\n" : `${result.kind}: ${result.reason}\n`);
  return 0;
}
