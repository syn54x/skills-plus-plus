// spp kind <N | issue URL> [--json]: what an issue is. An epic has Sub-issues, a ticket passes the ticket lint, anything else is raw.
import { runGh } from "../gh.ts";
import { isIssueRef, lintTicket } from "../ticket.ts";

export const USAGE = "usage: spp kind <issue number | issue URL> [--json]\n";

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
  const result =
    issue.subIssuesSummary.total > 0
      ? { kind: "epic", reason: `${issue.subIssuesSummary.total} Sub-issues` }
      : failures.length === 0
        ? { kind: "ticket", reason: "carries the ticket contract and one size" }
        : { kind: "raw", reason: failures.map((f) => f.detail).join("; ") };
  process.stdout.write(args.includes("--json") ? JSON.stringify(result, null, 2) + "\n" : `${result.kind}: ${result.reason}\n`);
  return 0;
}
