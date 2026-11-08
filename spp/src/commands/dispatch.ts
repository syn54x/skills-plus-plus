/**
 * `spp dispatch <issue> --driver bg|desktop|subagent` starts one worker on a Sub-issue that nobody holds, and refuses
 * one held by the `claimed` label or an assignee. It has no `--json`.
 *
 * Before it writes the brief or starts a worker, it records in spp's state directory whether this session is attended,
 * and the worker's `spp signal` trusts that decision over its own environment; a refused dispatch records nothing.
 *
 * What it does depends on the driver:
 *
 * - `bg` writes the brief, starts a background session named `t-<N>` on it
 *   (`claude --bg --worktree sdd-<N> --name t-<N>`), records `t-<N>` as the Worker on the progress comment and prints
 *   `started t-<N>`.
 * - `desktop` and `subagent` write the brief and print its path, since those drivers are harness tools the skill
 *   starts itself.
 *
 * `subagent` refuses a folder that is not inside a git repository, before it reads GitHub. The `spp:worker` agent
 * cuts its worktree from the session's folder, so every worker started from such a folder would fail.
 *
 * @module
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { isAttended, passDecision } from "../attended.ts";
import { asDriver } from "../derive.ts";
import { runGh } from "../gh.ts";
import { flagPairs, guarded, parseIssue, UsageError } from "../markers.ts";
import { run as brief } from "./brief.ts";
import { saveProgress } from "./progress.ts";

/** The usage text `spp dispatch --help` prints. */
export const USAGE = `usage: spp dispatch <issue number | issue URL> --driver bg|desktop|subagent
Refuses a ticket that is held (the claimed label or an assignee). bg writes the brief, starts
claude --bg --worktree sdd-<N> --name t-<N> on it and records t-<N> as the worker; desktop and subagent
write the brief and print its path, because those drivers are harness tools the skill calls itself.
subagent refuses a folder outside a git repository, because the spp:worker agent cuts its worktree from it.
`;

/**
 * Starts a worker on one Sub-issue, or writes the brief for the skill to start one.
 *
 * @param args - The Sub-issue (an issue number in the current repo or an issue URL) and `--driver bg|desktop|subagent`.
 * @returns 0 when the worker started or the brief is written; 2 on a usage error, with the usage on stderr; 1 when
 *   the ticket is held, `--driver subagent` runs outside a git repository, `claude --bg` fails or `gh` fails, with
 *   the reason on stderr.
 * @example
 * ```bash
 * spp dispatch 265 --driver bg
 * ```
 */
export function run(args: string[]): Promise<number> {
  return guarded(() => "dispatch", USAGE, async () => {
    const [arg, ...rest] = args;
    const driver = flagPairs(rest, ["--driver"]).find(([f]) => f === "--driver")?.[1];
    if (arg === undefined || !driver || !asDriver(driver)) throw new UsageError(driver ? `unknown driver ${driver}` : "");
    const issue = parseIssue(arg);
    // Claude Code makes the spp:worker agent's worktree from the session folder, so outside a repository every start fails.
    if (driver === "subagent" && spawnSync("git", ["rev-parse", "--git-dir"]).status !== 0) {
      process.stderr.write(
        `spp dispatch: this folder is not inside a git repository, and the spp:worker agent cuts its worktree from this folder; run /build from inside the checkout of the repository that owns ${issue.label}, or choose another Driver\n`,
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
    // The worker trusts this decision over its own environment, which a claude --bg session may not carry (ADR 0012).
    const repo = /^https:\/\/github\.com\/([^/]+\/[^/]+)\//.exec(view.url)?.[1] ?? issue.repo;
    passDecision({ XDG_STATE_HOME: process.env.XDG_STATE_HOME, HOME: process.env.HOME || homedir() }, repo, Number(issue.number), isAttended(process.env));
    if (driver !== "bg") return brief([issue.arg]);

    const file = join(mkdtempSync(join(tmpdir(), "spp-dispatch-")), `brief-${issue.number}.md`);
    const code = await brief([issue.arg, "--out", file]);
    if (code) return code;
    const name = `t-${issue.number}`;
    const prompt = `Your full brief is the file ${file}. Read it completely before anything else, then run the implement-issue skill for ${view.url} and follow it.`;
    const r = spawnSync("claude", ["--bg", "--worktree", `sdd-${issue.number}`, "--name", name, prompt], { encoding: "utf8" });
    if (r.status !== 0) {
      process.stderr.write(`spp dispatch: claude --bg failed: ${(r.stderr || r.error?.message || `exit ${r.status}`).trim()}\n`);
      return 1;
    }
    await saveProgress(issue.arg, { worker: name });
    process.stdout.write(`started ${name}${r.stdout.trim() ? ` (${r.stdout.trim()})` : ""}\n`);
  });
}
