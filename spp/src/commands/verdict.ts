/**
 * `spp verdict <pr> --ticket N --head SHA --spec pass|fail --quality pass|fail` records the slice gate's two verdicts
 * as the pull request's `<!-- spp-verdict -->` Marker comment, rewritten in place, and prints its URL. It writes only
 * while the pull request is still at `SHA`, because a verdict counts only on the head it was given on; when the head
 * has moved it writes nothing and the reviewer reviews the new head. The trailer's `by` records the write's maker:
 * review, or the skill and step `--by "<skill> <step>"` names. It has no `--json`.
 *
 * @module
 */
import { runGh } from "../gh.ts";
import { type By, flagPairs, guarded, parseBy, print, UsageError, writeMarker } from "../markers.ts";
import { renderVerdict, type Verdict, VERDICT_MARKER } from "../verdict.ts";

/** The usage text `spp verdict --help` prints. */
export const USAGE = `usage: spp verdict <pr number | pr URL> --ticket N --head SHA --spec pass|fail --quality pass|fail
                   [--by "<skill> <step>"]
Writes the verdict comment while the pull request is still at SHA (7 to 40 hex characters); exits 3 when it moved.
--by records the write as that skill's (default review), the rest of the value as its step.
`;

/**
 * Writes the verdict comment on a pull request (a number in the current repo or its URL; a pull request's comments
 * are its issue comments) and returns the comment's URL.
 *
 * @internal
 */
export function writeVerdict(pr: string, v: Verdict, by?: By): Promise<string> {
  const issue = pr.replace(/^(https:\/\/github\.com\/[^/]+\/[^/]+)\/pull\/(\d+)\/?$/, "$1/issues/$2");
  return writeMarker(issue, VERDICT_MARKER, renderVerdict, { ticket: v.ticket, head: v.head, spec: v.spec, quality: v.quality }, by);
}

const isVerdict = (v: string | undefined): v is Verdict["spec"] => v === "pass" || v === "fail";

/**
 * Writes the gate's verdict comment on a pull request.
 *
 * @param args - The pull request (a number or URL), `--ticket N`, `--head SHA` (7 to 40 hex characters), and
 *   `--spec` and `--quality`, each `pass` or `fail`.
 * @returns 0 when the comment is written; 3 when the head moved, with the current head on stderr; 2 on a usage
 *   error, with the usage on stderr; 1 when `gh` fails, with the reason on stderr.
 * @example
 * ```bash
 * spp verdict 270 --ticket 265 --head abc1234 --spec pass --quality fail
 * ```
 */
export function run(args: string[]): Promise<number> {
  return guarded(() => "verdict", USAGE, async () => {
    const [pr, ...rest] = args;
    if (pr === undefined || pr.startsWith("--")) throw new UsageError("");
    const f = Object.fromEntries(flagPairs(rest, ["--ticket", "--head", "--spec", "--quality", "--by"], "verdict: "));
    const { "--ticket": ticket, "--head": head, "--spec": spec, "--quality": quality } = f;
    const by = f["--by"] === undefined ? undefined : parseBy(f["--by"]);
    if (!ticket) throw new UsageError("--ticket is required");
    if (!/^[0-9a-f]{7,40}$/i.test(head ?? "")) throw new UsageError("--head must be a commit sha of 7 to 40 hex characters");
    if (!isVerdict(spec) || !isVerdict(quality)) throw new UsageError("--spec and --quality must each be pass or fail");
    const current = (await runGh(["pr", "view", pr, "--json", "headRefOid", "--jq", ".headRefOid"])).trim();
    if (!current.toLowerCase().startsWith(head.toLowerCase())) {
      process.stderr.write(`spp verdict: head moved: the pull request is at ${current}, not ${head}; review the new head\n`);
      return 3;
    }
    print(await writeVerdict(pr, { ticket: ticket.replace(/^#/, ""), head, spec, quality }, by));
  });
}
