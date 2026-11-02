/**
 * `spp kind <issue> [--json]` says what an issue is: an Epic (it has Sub-issues), a hardened Sub-issue (it passes
 * `spp lint ticket`, its Verify pin included, and has a parent Epic), a hardened One-off (it passes the lint and has
 * no Epic) or a raw issue (anything else, including one whose Verify block was never pinned or changed since), and why.
 * `/build` routes on it, sends a raw issue to `/triage` to be hardened again, and builds a Sub-issue through its
 * Epic, never as a One-off. Without
 * `--json` the answer is one line, such as `one-off: carries the ticket contract and one size`; with `--json` it prints
 * {@link Kind}.
 *
 * @module
 */
import { runGh } from "../gh.ts";
import { checkPin } from "../pin.ts";
import { isIssueRef, lintTicket, parseTicket } from "../ticket.ts";

/** What an issue is: the `--json` shape of `spp kind`. */
export type Kind = {
  /**
   * `epic` when it has Sub-issues; when it passes the ticket lint and its Verify block matches its pin, `sub-issue`
   * if it has a parent Epic and `one-off` if it has none; `raw` otherwise.
   */
  kind: "epic" | "sub-issue" | "one-off" | "raw";
  /**
   * Why: the Sub-issue count for an Epic, the parent's URL for a Sub-issue, and for a raw issue every lint failure,
   * joined by `; `, or the `pin-present` or `pin-match` detail when the lint passes but the pin does not.
   */
  reason: string;
};

/** The usage text `spp kind --help` prints. */
export const USAGE = "usage: spp kind <issue number | issue URL> [--json]\n";

/**
 * Prints what an issue is.
 *
 * @param args - The issue (a number in the current repo or a GitHub issue URL), and `--json` for the {@link Kind}
 *   shape.
 * @returns 0 when it printed the kind, `raw` included; 2 on a usage error, with the usage on stderr. A `gh` error exits 1 with the
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
  const issue = JSON.parse(await runGh(["issue", "view", rest[0], "--json", "body,labels,parent,subIssuesSummary"])) as {
    body: string;
    labels: { name: string }[];
    parent: { url: string } | null;
    subIssuesSummary: { total: number };
  };
  const failures = lintTicket(issue.body ?? "", issue.labels.map((l) => l.name));
  if (issue.subIssuesSummary.total === 0 && failures.length === 0) {
    // The ready gate's pin check: a block never pinned, or edited since, is no longer hardened.
    const refusal = await checkPin(rest[0], parseTicket(issue.body ?? "").verify);
    if (refusal) failures.push(refusal);
  }
  const result: Kind =
    issue.subIssuesSummary.total > 0
      ? { kind: "epic", reason: `${issue.subIssuesSummary.total} Sub-issues` }
      : failures.length > 0
        ? { kind: "raw", reason: failures.map((f) => f.detail).join("; ") }
        : issue.parent
          ? { kind: "sub-issue", reason: `carries the ticket contract and one size; Sub-issue of ${issue.parent.url}` }
          : { kind: "one-off", reason: "carries the ticket contract and one size" };
  process.stdout.write(args.includes("--json") ? JSON.stringify(result, null, 2) + "\n" : `${result.kind}: ${result.reason}\n`);
  return 0;
}
