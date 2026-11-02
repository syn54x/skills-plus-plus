/**
 * `spp lint ticket <issue> [--pin <body-file>] [--json]` is the mechanical half of hardening. It checks the required
 * sections, a fenced Verify block, Files owned lines starting `Create`, `Modify` or `Test`, Test scenarios shaped
 * `<category>: ... → ...`, exactly one `size:` label, and no placeholder text. It prints `ok`, or one
 * `<rule>: <detail>` line per failure; with `--json` it prints {@link LintResult}. With `--pin <body-file>`, the file
 * the agent just wrote to the issue, a passing ticket's Verify block is pinned: the sha256 of the file's block goes
 * into the progress comment's trailer, and `spp verify` refuses to run a block that no longer matches it (ADR 0009).
 * The pin is taken from the file and not from the issue, so an edit made after the agent wrote the body is never
 * approved by it: when the issue's block differs from the file's, nothing is pinned and the lint fails with
 * `pin-match`. Hardening's last step is this run. Without `--pin`, as the ready gate runs it, a pin that a trusted
 * progress comment already holds must still match the issue's Verify block, or the lint fails with `pin-match`, so a
 * body edited after hardening never reaches `ready-for-agent`.
 *
 * @module
 */
import { readFileSync } from "node:fs";
import { runGh } from "../gh.ts";
import { find, parseIssue, readTrailer } from "../markers.ts";
import { type Failure, isIssueRef, lintTicket, parseTicket } from "../ticket.ts";
import { MARKER, savePin } from "./progress.ts";
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
export const USAGE = "usage: spp lint ticket <issue number | issue URL> [--pin <body-file>] [--json]\n";

/**
 * Lints one ticket.
 *
 * @param args - `ticket`, the issue (a number in the current repo or a GitHub issue URL), `--pin <body-file>` to pin
 *   a passing ticket's Verify block as the file holds it, and `--json` for the {@link LintResult} shape.
 * @returns 0 when the ticket passes (and, with `--pin`, its pin is written); 1 when it breaks a rule, including
 *   `pin-match` when the issue's Verify block differs from the file's (which pins nothing) or, without `--pin`, from
 *   the pin already written; 2 on a usage error, with
 *   the usage on stderr. A `gh` error or an unreadable body file also exits 1, with the reason on stderr.
 * @example
 * ```bash
 * spp lint ticket 265 --pin /tmp/harden-265.md
 * ```
 */
export async function run(args: string[]): Promise<number> {
  const at = args.indexOf("--pin");
  const file = at < 0 ? undefined : args[at + 1];
  const rest = args.filter((a, i) => a !== "--json" && (at < 0 || (i !== at && i !== at + 1)));
  if (rest.length !== 2 || rest[0] !== "ticket" || !isIssueRef(rest[1]) || (at >= 0 && (!file || file.startsWith("--")))) {
    process.stderr.write(USAGE);
    return 2;
  }
  const issue = JSON.parse(await runGh(["issue", "view", rest[1], "--json", "body,labels"])) as { body: string; labels: { name: string }[] };
  const failures = lintTicket(issue.body ?? "", issue.labels.map((l) => l.name));
  const block = parseTicket(issue.body ?? "").verify;
  const written = file === undefined ? undefined : parseTicket(readFileSync(file, "utf8")).verify;
  if (file !== undefined && written !== block) {
    failures.push({ rule: "pin-match", detail: `the issue's Verify block differs from the one in ${file}; write the file to the issue, then lint again` });
  }
  if (file === undefined) {
    // The ready gate: a block edited after hardening pinned it would only stall at the worker's spp verify.
    const pin = readTrailer((await find(parseIssue(rest[1]), MARKER))?.body ?? "")?.verifyPin;
    if (typeof pin === "string" && (block === null || pinOf(block) !== pin)) {
      failures.push({ rule: "pin-match", detail: `the Verify block changed since it was hardened; re-harden it (spp lint ticket ${rest[1]} --pin <body-file>)` });
    }
  }
  const ok = failures.length === 0;
  if (ok && written) await savePin(rest[1], pinOf(written));
  const result: LintResult = { ok, failures };
  process.stdout.write(
    args.includes("--json") ? JSON.stringify(result, null, 2) + "\n" : ok ? "ok\n" : failures.map((f) => `${f.rule}: ${f.detail}`).join("\n") + "\n",
  );
  return ok ? 0 : 1;
}
