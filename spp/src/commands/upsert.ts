/**
 * `spp upsert <issue> <marker> <body-file>` writes a one-writer Marker comment, such as the Epic's summary or retro,
 * verbatim and in place, and prints its URL. The body file's first line must be the marker; the comment gets no data
 * trailer. It has no `--json`.
 *
 * @module
 */
import { existsSync, readFileSync } from "node:fs";
import { guarded, print, upsertComment, UsageError } from "../markers.ts";

/** The usage text `spp upsert --help` prints. */
export const USAGE = "usage: spp upsert <issue> <marker> <body-file>\nThe body file's first line must be the marker; it is written verbatim, with no trailer.\n";

/**
 * Creates or rewrites the issue's comment that starts with the marker.
 *
 * @param args - The issue (a number in the current repo or a GitHub issue URL), the marker, and the body file.
 * @returns 0 when the comment is written; 2 on a usage error (a missing body file, or a first line that is not the
 *   marker), with the usage on stderr; 1 when `gh` fails, with the reason on stderr.
 * @example
 * ```bash
 * spp upsert 197 "<!-- sdd-summary -->" summary.md
 * ```
 */
export function run(args: string[]): Promise<number> {
  return guarded(() => "upsert", USAGE, async () => {
    if (args.length !== 3) throw new UsageError("upsert takes <issue> <marker> <body-file>");
    const [issue, marker, file] = args;
    if (!existsSync(file)) throw new UsageError(`no body file: ${file}`);
    const body = readFileSync(file, "utf8");
    if (body.split("\n")[0] !== marker) throw new UsageError(`first line of ${file} must be the marker ${marker}`);
    print(await upsertComment(issue, marker, body));
  });
}
