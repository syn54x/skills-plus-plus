/**
 * `spp lint ticket <issue> [--json]` is the mechanical half of hardening. It checks the required sections, a fenced
 * Verify block, Files owned lines starting `Create`, `Modify` or `Test`, Test scenarios shaped
 * `<category>: ... → ...`, exactly one `size:` label, and no placeholder text. It prints `ok`, or one
 * `<rule>: <detail>` line per failure; with `--json` it prints {@link LintResult}.
 *
 * @module
 */
import { runGh } from "../gh.ts";
import { type Failure, isIssueRef, lintTicket } from "../ticket.ts";

export type { Failure } from "../ticket.ts";

/** The lint's answer: the `--json` shape of `spp lint ticket`. */
export type LintResult = {
  /** Whether the ticket passes every rule. */
  ok: boolean;
  /** One entry per broken rule; empty when `ok`. */
  failures: Failure[];
};

/** The usage text `spp lint --help` prints. */
export const USAGE = "usage: spp lint ticket <issue number | issue URL> [--json]\n";

/**
 * Lints one ticket.
 *
 * @param args - `ticket`, the issue (a number in the current repo or a GitHub issue URL), and `--json` for the
 *   {@link LintResult} shape.
 * @returns 0 when the ticket passes; 1 when it breaks a rule; 2 on a usage error, with the usage on stderr. A `gh`
 *   error also exits 1, with the reason on stderr.
 * @example
 * ```bash
 * spp lint ticket 265
 * ```
 */
export async function run(args: string[]): Promise<number> {
  const rest = args.filter((a) => a !== "--json");
  if (rest.length !== 2 || rest[0] !== "ticket" || !isIssueRef(rest[1])) {
    process.stderr.write(USAGE);
    return 2;
  }
  const issue = JSON.parse(await runGh(["issue", "view", rest[1], "--json", "body,labels"])) as { body: string; labels: { name: string }[] };
  const failures = lintTicket(issue.body ?? "", issue.labels.map((l) => l.name));
  const ok = failures.length === 0;
  const result: LintResult = { ok, failures };
  process.stdout.write(
    args.includes("--json") ? JSON.stringify(result, null, 2) + "\n" : ok ? "ok\n" : failures.map((f) => `${f.rule}: ${f.detail}`).join("\n") + "\n",
  );
  return ok ? 0 : 1;
}
