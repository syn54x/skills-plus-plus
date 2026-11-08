/**
 * `spp feedback` works on Skill feedback: it checks a draft before anyone files it, and lists the Signals waiting to
 * become one.
 *
 * Its two forms:
 *
 * - `spp feedback check <body-file> [--title-file <file>]` is the outbound check on a skill-feedback draft, run before
 *   anyone files it. The Routing block's Self-improvement mode sets what the draft may say. A blocked draft prints one
 *   `rule <rule> <name>, line <n>: <text>` line per hit on stdout. It never rewrites the draft. The title file holds
 *   one title per line, and a line that is only `owner/repo` names a repo. It has no `--json`.
 * - `spp feedback pending [--json]` lists the current repo's Signal log grouped by fingerprint (one skill step and
 *   category), most Signals first: one `<fingerprint> <count> <skill> <step> <category>` line each, or with `--json`
 *   a {@link FeedbackCandidate} list. An absent log lists nothing.
 *
 * @module
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { checkFeedback } from "../feedback.ts";
import { runGh } from "../gh.ts";
import { currentRepo } from "../notes.ts";
import { readSelfImprovementMode } from "../routing.ts";
import { pendingCandidates } from "../signals.ts";

export type { FeedbackCandidate } from "../signals.ts";

/** The usage text `spp feedback --help` prints. */
export const USAGE = "usage: spp feedback check <body-file> [--title-file <file>]\n       spp feedback pending [--json]\n";
const OWNER_REPO = /^[\w.-]+\/[\w.-]+$/;

/**
 * Checks a skill-feedback draft against the repo's Self-improvement mode, or lists the pending candidates.
 *
 * @param args - `check`, the draft's body file, then `--title-file <file>` for the titles and repo names it must not
 *   leak; or `pending`, then `--json` for the {@link FeedbackCandidate} list.
 * @returns For `check`: 0 with no output when the draft is clean; 2 when it is blocked, one line per hit on stdout; 1
 *   when the mode is Off or unset. For `pending`: 0, an absent log included. 1 on a usage error (with the usage on
 *   stderr).
 * @example
 * ```bash
 * spp feedback check draft.md --title-file titles.txt
 * spp feedback pending --json
 * ```
 */
export async function run(args: string[]): Promise<number> {
  const [sub, body, ...flags] = args;
  if (sub === "pending" && (args.length === 1 || (args.length === 2 && body === "--json"))) {
    const candidates = pendingCandidates(currentRepo());
    if (body === "--json") process.stdout.write(JSON.stringify(candidates, null, 2) + "\n");
    else for (const c of candidates) process.stdout.write(`${c.fingerprint} ${c.count} ${c.skill} ${c.step} ${c.category}\n`);
    return 0;
  }
  const titleFile = flags[0] === "--title-file" && flags.length === 2 ? flags[1] : undefined;
  if (sub !== "check" || !body || (flags.length > 0 && titleFile === undefined)) {
    process.stderr.write(USAGE);
    return 1;
  }

  const profile = readSelfImprovementMode(process.cwd());
  if (profile === "Off") {
    process.stderr.write("spp feedback check: Self-improvement mode is Off (or unset): nothing may be filed\n");
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
