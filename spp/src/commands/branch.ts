/**
 * `spp branch <epic> [--from <base>]` creates the Epic's integration branch `feat/<slug>` from `origin/<base>`
 * (default `main`), pushes it, records it on the plan comment through `spp plan --branch`, and prints the branch name.
 * When the branch exists it switches to it, and writes the plan comment only when the comment does not already name
 * the branch, so a second run finishes whatever the first left undone. It has no `--json`.
 *
 * @module
 */
import { execFileSync } from "node:child_process";
import { runGh } from "../gh.ts";
import { find, flagPairs, guarded, parseIssue, readTrailer, UsageError } from "../markers.ts";
import { run as plan } from "./plan.ts";

/** The usage text `spp branch --help` prints. */
export const USAGE = `usage: spp branch <epic number | issue URL> [--from <base>]
Creates feat/<slug> from origin/<base> (default main), pushes it and records it with spp plan --branch.
If the branch exists, switches to it; the plan is written only when it does not already name the branch.
`;

/**
 * A title as a branch-name slug: lowercase, runs of anything but a-z0-9 become one dash, at most 40 characters, no edge dashes.
 *
 * @internal
 */
export const slug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40).replace(/^-|-$/g, "");

const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

function hasRef(ref: string): boolean {
  try {
    git("rev-parse", "--verify", "--quiet", ref);
    return true;
  } catch {
    return false;
  }
}

/**
 * Creates or switches to the Epic's integration branch and records it on the plan comment.
 *
 * @param args - The Epic (an issue number in the current repo or an issue URL), then `--from <base>` to cut from a
 *   branch other than `main`.
 * @returns 0 when the branch is in place and recorded; 2 on a usage error, with the usage on stderr; 1 when `git`
 *   or `gh` fails, with the reason on stderr.
 * @example
 * ```bash
 * spp branch 197 --from next
 * ```
 */
export function run(args: string[]): Promise<number> {
  return guarded(() => "branch", USAGE, async () => {
    const [arg, ...rest] = args;
    if (arg === undefined) throw new UsageError("");
    const epic = parseIssue(arg);
    const base = flagPairs(rest, ["--from"]).find(([f]) => f === "--from")?.[1] ?? "main";
    const title = (JSON.parse(await runGh(["issue", "view", epic.arg, "--json", "title"])) as { title: string }).title;
    const branch = `feat/${slug(title)}`;

    git("fetch", "-q", "origin");
    const onOrigin = hasRef(`refs/remotes/origin/${branch}`);
    if (onOrigin || hasRef(`refs/heads/${branch}`)) git("switch", "-q", branch);
    else git("switch", "-q", "-c", branch, `origin/${base}`);
    if (!onOrigin) git("push", "-q", "-u", "origin", branch); // also finishes a run that stopped after the local branch was made
    process.stdout.write(branch + "\n");

    const recorded = readTrailer((await find(epic, "<!-- sdd-plan -->"))?.body ?? "")?.branch;
    return recorded === branch ? 0 : plan([epic.arg, "--branch", branch]);
  });
}
