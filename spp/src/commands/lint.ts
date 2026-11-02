// spp lint ticket <N | issue URL> [--json]: the mechanical half of hardening, one line per failed rule.
import { runGh } from "../gh.ts";
import { isIssueRef, lintTicket } from "../ticket.ts";

const USAGE = "usage: spp lint ticket <issue number | issue URL> [--json]\n";

export async function run(args: string[]): Promise<number> {
  const rest = args.filter((a) => a !== "--json");
  if (rest.length !== 2 || rest[0] !== "ticket" || !isIssueRef(rest[1])) {
    process.stderr.write(USAGE);
    return 2;
  }
  const issue = JSON.parse(await runGh(["issue", "view", rest[1], "--json", "body,labels"])) as { body: string; labels: { name: string }[] };
  const failures = lintTicket(issue.body ?? "", issue.labels.map((l) => l.name));
  const ok = failures.length === 0;
  process.stdout.write(
    args.includes("--json") ? JSON.stringify({ ok, failures }, null, 2) + "\n" : ok ? "ok\n" : failures.map((f) => `${f.rule}: ${f.detail}`).join("\n") + "\n",
  );
  return ok ? 0 : 1;
}
