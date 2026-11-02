// spp upsert <issue> <marker> <body-file>: writes a one-writer Marker comment (summary, retro) verbatim, in place.
import { existsSync, readFileSync } from "node:fs";
import { guarded, print, upsertComment, UsageError } from "../markers.ts";

export const USAGE = "usage: spp upsert <issue> <marker> <body-file>\nThe body file's first line must be the marker; it is written verbatim, with no trailer.\n";

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
