/**
 * `spp feedback check <body-file> [--title-file <file>]` is the outbound check on a skill-feedback draft that
 * `/close-epic` proposes, run before anyone files it. The Routing block's `upstreamFeedback` profile sets what the
 * draft may say. A blocked draft prints one `rule <rule> <name>, line <n>: <text>` line per hit on stdout. It never
 * rewrites the draft. The title file holds one title per line, and a line that is only `owner/repo` names a repo.
 * It has no `--json`.
 *
 * @module
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { checkFeedback } from "../feedback.ts";
import { runGh } from "../gh.ts";
import { readRouting } from "../routing.ts";

/** The usage text `spp feedback --help` prints. */
export const USAGE = "usage: spp feedback check <body-file> [--title-file <file>]\n";
const OWNER_REPO = /^[\w.-]+\/[\w.-]+$/;

/**
 * Checks a skill-feedback draft against the repo's upstream feedback profile.
 *
 * @param args - `check`, the draft's body file, then `--title-file <file>` for the titles and repo names it must not leak.
 * @returns 0 with no output when the draft is clean; 2 when it is blocked, one line per hit on stdout; 1 when the
 *   profile is off or unset, and on a usage error (with the usage on stderr).
 * @example
 * ```bash
 * spp feedback check draft.md --title-file titles.txt
 * ```
 */
export async function run(args: string[]): Promise<number> {
  const [sub, body, ...flags] = args;
  const titleFile = flags[0] === "--title-file" && flags.length === 2 ? flags[1] : undefined;
  if (sub !== "check" || !body || (flags.length > 0 && titleFile === undefined)) {
    process.stderr.write(USAGE);
    return 1;
  }

  const profile = readRouting(process.cwd())?.routing.upstreamFeedback ?? "off";
  if (profile === "off") {
    process.stderr.write("spp feedback check: Upstream feedback is off (or unset): nothing may be filed\n");
    return 1;
  }

  const ownRepo = (await runGh(["repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"])).trim();
  const lines = titleFile ? readFileSync(titleFile, "utf8").split(/\r?\n/).map((l) => l.trim()).filter(Boolean) : [];
  const paths = execFileSync("git", ["ls-files", "--full-name", "-z", "--", ":/"], { encoding: "utf8", maxBuffer: 1 << 28 }).split("\0").filter(Boolean);

  const hits = checkFeedback(readFileSync(body, "utf8"), {
    profile,
    ownRepo,
    names: lines.filter((l) => OWNER_REPO.test(l)),
    titles: lines.filter((l) => !OWNER_REPO.test(l)),
    paths,
  });
  for (const h of hits) process.stdout.write(`rule ${h.rule} ${h.name}, line ${h.line}: ${h.text}\n`);
  return hits.length ? 2 : 0;
}
