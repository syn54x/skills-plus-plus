/**
 * `spp dispatch <issue>` readies one worker on a Sub-issue that nobody holds: it writes the brief and prints its path,
 * for the skill to start the `spp:worker` subagent on. It refuses a Sub-issue held by the `claimed` label or an
 * assignee. It takes no flags and has no `--json`.
 *
 * Before it writes the brief, it records in spp's state directory whether this session is attended, and the worker's
 * `spp signal` trusts that decision over its own environment; a refused dispatch records nothing.
 *
 * It refuses a folder that is not inside a git repository, before it reads GitHub. The `spp:worker` agent cuts its
 * worktree from the session's folder, so every worker started from such a folder would fail.
 *
 * @module
 */
import { spawnSync } from "node:child_process";
import { isAttended, passDecision } from "../attended.ts";
import { runGh } from "../gh.ts";
import { flagPairs, guarded, parseIssue, UsageError } from "../markers.ts";
import { run as brief } from "./brief.ts";

/** The usage text `spp dispatch --help` prints. */
export const USAGE = `usage: spp dispatch <issue number | issue URL>
Refuses a ticket that is held (the claimed label or an assignee); otherwise writes the brief and prints
its path, for the skill to start the spp:worker subagent on. Refuses a folder outside a git repository,
because the spp:worker agent cuts its worktree from it.
`;

/**
 * Writes the brief for one Sub-issue, for the skill to start its worker on.
 *
 * @param args - The Sub-issue: an issue number in the current repo or an issue URL. Any flag is a usage error.
 * @returns 0 when the brief is written; 2 on a usage error, with the usage on stderr; 1 when the ticket is held, the
 *   folder is outside a git repository or `gh` fails, with the reason on stderr.
 * @example
 * ```bash
 * spp dispatch 265
 * ```
 */
export function run(args: string[]): Promise<number> {
  return guarded(() => "dispatch", USAGE, async () => {
    const [arg, ...rest] = args;
    flagPairs(rest, []);
    if (arg === undefined) throw new UsageError("");
    const issue = parseIssue(arg);
    // Claude Code makes the spp:worker agent's worktree from the session folder, so outside a repository every start fails.
    if (spawnSync("git", ["rev-parse", "--git-dir"]).status !== 0) {
      process.stderr.write(
        `spp dispatch: this folder is not inside a git repository, and the spp:worker agent cuts its worktree from this folder; run /build from inside the checkout of the repository that owns ${issue.label}\n`,
      );
      return 1;
    }

    type View = { url: string; labels: { name: string }[]; assignees: { login: string }[] };
    const view = JSON.parse(await runGh(["issue", "view", issue.arg, "--json", "url,labels,assignees"])) as View;
    const holders = [...view.labels.filter((l) => l.name === "claimed").map(() => "the claimed label"), ...view.assignees.map((a) => a.login)];
    if (holders.length) {
      process.stderr.write(`spp dispatch: ${issue.label} is held (${holders.join(", ")}); not starting a second worker\n`);
      return 1;
    }
    // The worker trusts this decision over its own environment, which may not carry the attended variables (ADR 0012).
    const repo = /^https:\/\/github\.com\/([^/]+\/[^/]+)\//.exec(view.url)?.[1] ?? issue.repo;
    passDecision(process.env, repo, Number(issue.number), isAttended(process.env));
    return brief([issue.arg]);
  });
}
