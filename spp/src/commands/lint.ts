/**
 * `spp lint ticket <issue> [--pin] [--json]` is the mechanical half of hardening. It checks the required sections, a
 * fenced Verify block, Files owned lines starting `Create`, `Modify` or `Test`, Test scenarios shaped
 * `<category>: ... → ...`, exactly one `size:` label, and no placeholder text. It prints `ok`, or one
 * `<rule>: <detail>` line per failure; with `--json` it prints {@link LintResult}. With `--pin`, a passing ticket's
 * Verify block is pinned: its sha256 goes into the progress comment's trailer, and `spp verify` refuses to run a
 * block that no longer matches it (ADR 0009). Hardening's last step is this run.
 *
 * @module
 */
import { runGh } from "../gh.ts";
import { type Failure, isIssueRef, lintTicket, parseTicket } from "../ticket.ts";
import { savePin } from "./progress.ts";
import { pinOf } from "./verify.ts";

export type { Failure } from "../ticket.ts";

/** The lint's answer: the `--json` shape of `spp lint ticket`. */
export type LintResult = {
  /** Whether the ticket passes every rule. */
  ok: boolean;
  /** One entry per broken rule; empty when `ok`. */
  failures: Failure[];
};

/** The usage text `spp lint --help` prints. */
export const USAGE = "usage: spp lint ticket <issue number | issue URL> [--pin] [--json]\n";

/**
 * Lints one ticket.
 *
 * @param args - `ticket`, the issue (a number in the current repo or a GitHub issue URL), `--pin` to pin a passing
 *   ticket's Verify block, and `--json` for the {@link LintResult} shape.
 * @returns 0 when the ticket passes (and, with `--pin`, its pin is written); 1 when it breaks a rule, which pins
 *   nothing; 2 on a usage error, with the usage on stderr. A `gh` error also exits 1, with the reason on stderr.
 * @example
 * ```bash
 * spp lint ticket 265 --pin
 * ```
 */
export async function run(args: string[]): Promise<number> {
  const rest = args.filter((a) => a !== "--json" && a !== "--pin");
  if (rest.length !== 2 || rest[0] !== "ticket" || !isIssueRef(rest[1])) {
    process.stderr.write(USAGE);
    return 2;
  }
  const issue = JSON.parse(await runGh(["issue", "view", rest[1], "--json", "body,labels"])) as { body: string; labels: { name: string }[] };
  const failures = lintTicket(issue.body ?? "", issue.labels.map((l) => l.name));
  const ok = failures.length === 0;
  if (ok && args.includes("--pin")) await savePin(rest[1], pinOf(parseTicket(issue.body ?? "").verify!));
  const result: LintResult = { ok, failures };
  process.stdout.write(
    args.includes("--json") ? JSON.stringify(result, null, 2) + "\n" : ok ? "ok\n" : failures.map((f) => `${f.rule}: ${f.detail}`).join("\n") + "\n",
  );
  return ok ? 0 : 1;
}
