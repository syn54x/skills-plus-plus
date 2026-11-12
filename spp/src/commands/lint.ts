/**
 * `spp lint ticket <issue>` is the mechanical half of hardening, and `spp lint pr <pr>` is the worker's check of its pull
 * request body before it reports. Each prints `ok`, or one `<rule>: <detail>` line per failure, and exits 1 on a failure.
 *
 * `spp lint ticket <issue> [--pin <body-file> [--by "<skill> <step>"]] [--json]` is the mechanical half of hardening. It checks the required
 * sections, a fenced Verify block, Files owned lines starting `Create`, `Modify` or `Test`, Test scenarios shaped
 * `<category>: ... → ...`, exactly one `size:` label, and no placeholder text. It prints `ok`, or one
 * `<rule>: <detail>` line per failure; with `--json` it prints {@link LintResult}. With `--pin <body-file>`, the file
 * the agent just wrote to the issue, a passing ticket's Verify block is pinned: the sha256 of the file's block goes
 * into the progress comment's trailer, and `spp verify` refuses to run a block that no longer matches it (ADR 0009).
 * The trailer's `verifyPinBy` and `by` record the pin's maker: harden, or the skill and step `--by "<skill> <step>"`
 * names (triaging passes `--by "triaging re-pin"`); later progress writes keep `verifyPinBy`.
 * The pin is taken from the file and not from the issue, so an edit made after the agent wrote the body is never
 * approved by it: when the issue's block differs from the file's, nothing is pinned and the lint fails with
 * `pin-match`. Hardening's last step is this run. Without `--pin`, as the ready gate and the worker's readiness check
 * run it, the issue's Verify block must carry a pin from a trusted progress comment, or the lint fails with
 * `pin-present`, and must still match that pin, or it fails with `pin-match`. So a ticket never hardened, or edited
 * after hardening, never reaches `ready-for-agent`, and a worker stops before running its block by hand.
 *
 * A `pin-match` without `--pin` also records a `contract-edited` Signal, charged to the maker of the Verify pin
 * (harden when it names none), when the issue body's last editor is trusted (ADR 0009); with `--pin` it records none.
 * It records nothing under `CI`, outside an Attended session, or when the Self-improvement mode of this checkout, or of
 * another repo whose issue it is about, is Off. A Signal goes to this checkout's log, and a failure
 * while recording is one `signal not recorded:` line on stderr that leaves the exit code as it was.
 *
 * `spp lint pr <pr number | pr URL> [--json]` is the worker's check of its pull request body before it reports. It reads
 * the pull request with `gh pr view <pr> --json body,headRefOid` and checks the form of the sections the review gate
 * looks for, ignoring fenced blocks and HTML comments, since a body may quote the template. `link`: the first line is
 * `Closes #<N>` (or `Fixes`, `Resolves`), or some line reads `Refs #<N>`, `Refs owner/repo#<N>` or `Refs <issue URL>`
 * (a Fix pull request). `section-present`: `## Ticket` and `## Laws` are there and not empty. `ticket-na`: no
 * `## Ticket` line reads `n/a`. `verify-sha`: a line that mentions Verify names a 7 to 40 character SHA the head
 * starts with, so a Verify line left on an older head after a fix round fails. `verify-corrected`: exactly one
 * `Verify block corrected:` line, whose value is `no` or `yes:` followed by text, so `none` fails. `interfaces`: an
 * `Interfaces changed:` line. It prints `ok`, or one `<rule>: <detail>` line per failure, like `lint ticket`; with
 * `--json` it prints {@link LintResult}. It never judges whether a claim is true: the gate keeps that, and its own
 * finding for a body that still lacks a section.
 *
 * @module
 */
import { readFileSync } from "node:fs";
import { pinCorrection } from "../corrections.ts";
import { runGh } from "../gh.ts";
import { type By, parseBy, UsageError } from "../markers.ts";
import { checkPin } from "../pin.ts";
import { savePin } from "./progress.ts";
import { type Failure, isIssueRef, lintPr, lintTicket, parseTicket } from "../ticket.ts";

export type { Failure } from "../ticket.ts";

/** The lint's answer: the `--json` shape of `spp lint ticket` and `spp lint pr`. */
export type LintResult = {
  /** Whether the ticket or the pull request body passes every rule. */
  ok: boolean;
  /** One entry per broken rule; empty when `ok`. */
  failures: Failure[];
};

/** The usage text `spp lint --help` prints. */
export const USAGE = `usage: spp lint ticket <issue number | issue URL> [--pin <body-file> [--by "<skill> <step>"]] [--json]
       spp lint pr <pr number | pr URL> [--json]
--by records the pin as that skill's (default harden), the rest of the value as its step; it goes only with --pin.
`;

/**
 * Lints one ticket, or with `pr` one pull request body.
 *
 * @param args - `pr` and the pull request (a number in the current repo or a GitHub pull request URL), with `--json`
 *   for the {@link LintResult} shape; or `ticket`, the issue (a number in the current repo or a GitHub issue URL), `--pin <body-file>` to pin
 *   a passing ticket's Verify block as the file holds it, with `--by "<skill> <step>"` to name the pin's maker, and
 *   `--json` for the {@link LintResult} shape.
 * @returns 0 when the ticket passes (and, with `--pin`, its pin is written); 1 when it breaks a rule, including
 *   `pin-match` when the issue's Verify block differs from the file's (which pins nothing) or, without `--pin`, from
 *   the pin already written, and `pin-present` when, without `--pin`, a Verify block has no pin; 2 on a usage error,
 *   with the usage on stderr. A `gh` error or an unreadable body file also exits 1, with the reason on stderr.
 *   `pr` exits 0 when the body passes every rule, 1 when it breaks one or `gh` fails, and 2 on a usage error (no pull
 *   request, an issue URL, extra arguments).
 * @example
 * ```bash
 * spp lint ticket 265 --pin /tmp/harden-265.md
 * spp lint pr 40
 * ```
 */
export async function run(args: string[]): Promise<number> {
  if (args[0] === "pr") return lintPullRequest(args);
  const at = args.indexOf("--pin");
  const byAt = args.indexOf("--by");
  const file = at < 0 ? undefined : args[at + 1];
  const taken = [at, byAt].filter((i) => i >= 0).flatMap((i) => [i, i + 1]);
  const rest = args.filter((a, i) => a !== "--json" && !taken.includes(i));
  let by: By | undefined;
  try {
    // --by names the pin's maker, so it goes only with --pin.
    if (byAt >= 0) by = file === undefined ? undefined : parseBy(args[byAt + 1] ?? "");
  } catch (e) {
    if (!(e instanceof UsageError)) throw e;
  }
  const badBy = byAt >= 0 && by === undefined;
  if (rest.length !== 2 || rest[0] !== "ticket" || !isIssueRef(rest[1]) || (at >= 0 && (!file || file.startsWith("--"))) || badBy) {
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
    // The ready gate: a block never pinned, or edited since, would only stall at the worker's spp verify.
    const refusal = await checkPin(rest[1], block);
    if (refusal) failures.push(refusal);
  }
  const ok = failures.length === 0;
  if (ok && written) await savePin(rest[1], written, by);
  print(failures, args.includes("--json"));
  // Only the ready gate's pin-match is a correction: with --pin it is the hardener's own write racing an edit.
  if (file === undefined && failures.some((f) => f.rule === "pin-match")) await pinCorrection(rest[1]);
  return ok ? 0 : 1;
}

function print(failures: Failure[], json: boolean): void {
  const ok = failures.length === 0;
  const result: LintResult = { ok, failures };
  process.stdout.write(json ? JSON.stringify(result, null, 2) + "\n" : ok ? "ok\n" : failures.map((f) => `${f.rule}: ${f.detail}`).join("\n") + "\n");
}

// A pull request number or a GitHub pull request URL, the two forms `gh pr view` takes here.
const isPrRef = (s: string) => /^\d+$/.test(s) || /^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+\/?$/.test(s);

async function lintPullRequest(args: string[]): Promise<number> {
  const rest = args.filter((a) => a !== "--json");
  if (rest.length !== 2 || !isPrRef(rest[1])) {
    process.stderr.write(USAGE);
    return 2;
  }
  const pr = JSON.parse(await runGh(["pr", "view", rest[1], "--json", "body,headRefOid"])) as { body: string; headRefOid: string };
  const failures = lintPr(pr.body ?? "", pr.headRefOid);
  print(failures, args.includes("--json"));
  return failures.length === 0 ? 0 : 1;
}
