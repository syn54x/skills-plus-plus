// spp feedback check <body-file> [--title-file <file>]: close-epic's outbound check on a skill-feedback body.
// Exit 0 clean (no output), 2 blocked (one line per hit, on stdout), 1 when the profile is off or on a usage error.
// It never rewrites the body. The title file holds one title per line; a line that is only an owner/repo is a name.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { checkFeedback } from "../feedback.ts";
import { runGh } from "../gh.ts";
import { readRouting } from "../routing.ts";

export const USAGE = "usage: spp feedback check <body-file> [--title-file <file>]\n";
const OWNER_REPO = /^[\w.-]+\/[\w.-]+$/;

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
