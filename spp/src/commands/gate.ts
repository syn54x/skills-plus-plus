/**
 * `spp gate <pr number | pr URL> [--json]` reads a pull request's slice gate the way `spp merge` does: the verdict
 * comment from a trusted author (ADR 0009), judged against the pull request's current head, or its merged head once
 * it merged. It prints `gate-pass <pr> head <sha7>: spec pass, quality pass`, `gate-fail <pr> head <sha7>: spec fail,
 * quality pass` (spec or quality failed), or `pr-open <pr> head <sha7>: no passing verdict on this head` when there is
 * no trusted verdict or it names an older head. With `--json` it prints `{ pr, head, state, verdict, by }`: `verdict`
 * is the Verdict or null, and `by` is the maker the verdict comment's trailer records, or null when it records none.
 * Every state exits 0, so a caller branches on the state.
 *
 * @module
 */
import { gateOf } from "../derive.ts";
import { runGh } from "../gh.ts";
import { guarded, readMaker, UsageError } from "../markers.ts";
import { readVerdict } from "../verdict.ts";
import { verdictTrailer } from "./merge.ts";

/** The usage text `spp gate --help` prints. */
export const USAGE = "usage: spp gate <pr number | pr URL> [--json]\n";

/**
 * Prints the gate state of one pull request.
 *
 * @param args - The pull request (a number or URL), and `--json` for the `{ pr, head, state, verdict, by }` shape.
 * @returns 0 in every gate state; 1 on a `gh` error; 2 on a usage error, with the usage on stderr.
 * @example
 * ```bash
 * spp gate https://github.com/acme/app/pull/40 --json
 * ```
 */
export function run(args: string[]): Promise<number> {
  return guarded(() => "gate", USAGE, async () => {
    const rest = args.filter((a) => a !== "--json");
    if (rest.length !== 1) throw new UsageError("");
    const { url, headRefOid } = JSON.parse(await runGh(["pr", "view", rest[0], "--json", "url,headRefOid"])) as { url: string; headRefOid: string };
    const trailer = await verdictTrailer(url);
    const verdict = readVerdict(trailer);
    const state = gateOf({ headSha: headRefOid, verdict: verdict ?? undefined });
    const by = verdict ? readMaker(trailer) : null;
    if (args.includes("--json")) {
      process.stdout.write(JSON.stringify({ pr: url, head: headRefOid, state, verdict, by }) + "\n");
      return;
    }
    const detail = verdict && state !== "pr-open" ? `spec ${verdict.spec}, quality ${verdict.quality}` : "no passing verdict on this head";
    process.stdout.write(`${state} ${url} head ${headRefOid.slice(0, 7)}: ${detail}\n`);
  });
}
