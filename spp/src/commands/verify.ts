/**
 * `spp verify` runs a Sub-issue's Verify block and records the result on `HEAD`, and as a stop hook it holds a worker
 * on an `sdd/*` branch until that record exists. It has no `--json`.
 *
 * Its three forms:
 *
 * - `spp verify <issue>` runs the Sub-issue's Verify block from the repository root, one command per line (a trailing
 *   backslash continues a line), prints `pass:` or `fail:` per command with the commands' own output on stderr, and
 *   records the result as a note under `refs/notes/sdd-verify` on `HEAD`. It runs only a block that matches the pin
 *   hardening wrote in the progress comment (`spp lint ticket <issue> --pin <body-file>`), since anyone who can edit
 *   the issue can change the block after it was approved (ADR 0009), and only on a clean tree, so the note speaks for
 *   `HEAD`.
 * - `spp verify <issue> --print` runs nothing: it fetches the issue once, checks the pin on that fetch and prints the
 *   pinned block's commands, one per line, as the first form would run them, or refuses as the first form does and
 *   prints nothing. A skill that runs the block by hand runs only what this printed, so the check and the run read the
 *   same bytes (ADR 0009). It needs no clean tree.
 * - `spp verify --check` is the `Stop` and `SubagentStop` hook. On an `sdd/*` branch it blocks the stop when the tree
 *   is dirty or `HEAD` has no passing (or `blocked`) note, unless `HEAD` adds nothing to an integration branch or the
 *   default branch; on any other branch it passes unchecked. The check judges the tree the session stands in and
 *   cannot tell whose work is there, so a refused `Stop` also tells a session that is not the branch's worker to cd
 *   back to its own checkout and stop again.
 *
 * @module
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { workerTicket } from "../attended.ts";
import { runGh } from "../gh.ts";
import { checkPin } from "../pin.ts";
import { isIssueRef, parseTicket } from "../ticket.ts";

/** The usage text `spp verify --help` prints. */
export const USAGE = `usage: spp verify <issue number | issue URL> [--print]
       spp verify --check
The first runs the ticket's Verify block and records the result on HEAD; with --print it runs nothing and prints the
pinned block's commands. --check exits 2 on an sdd/* branch whose HEAD has no passing record or whose tree is dirty;
as a stop hook it reads the hook payload on stdin.
`;

/**
 * The fields of a Claude Code hook payload that spp reads.
 *
 * @internal
 */
export type HookInput = {
  cwd?: string;
  hook_event_name?: string;
  tool_name?: string;
  tool_input?: { command?: string };
  tool_response?: { stdout?: string };
};

/**
 * The hook payload on stdin, or {} when there is none. A stdin that stays open and silent (a command run by hand
 * from a shell that never closes it) is given up on after a second, so the command never hangs.
 *
 * @internal
 */
export function readHookInput(): Promise<HookInput> {
  if (process.stdin.isTTY) return Promise.resolve({});
  return new Promise((resolve) => {
    let text = "";
    const done = () => {
      clearTimeout(timer);
      process.stdin.destroy();
      try {
        const v = JSON.parse(text);
        resolve(v && typeof v === "object" ? v : {});
      } catch {
        resolve({});
      }
    };
    const timer = setTimeout(done, 1000);
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (d: string) => {
      clearTimeout(timer);
      text += d;
    });
    process.stdin.on("end", done).on("error", done);
  });
}

/**
 * Moves to the payload's cwd: hooks run from the project directory, which is not the worktree a session entered.
 *
 * @internal
 */
export function enterHookCwd(input: HookInput): void {
  if (input.cwd && existsSync(input.cwd)) process.chdir(input.cwd);
}

/**
 * git's trimmed stdout, or null when git fails (not a repository, no such note).
 *
 * @internal
 */
export function gitOut(...args: string[]): string | null {
  const r = spawnSync("git", args, { encoding: "utf8" });
  return r.status === 0 ? r.stdout.trim() : null;
}

// One command per line; a trailing backslash continues the line, and blank and comment lines are skipped.
// shortcut: each line runs in its own shell, so a `cd` on its own line does not carry to the next; join them with && instead.
const commands = (block: string) =>
  block.replace(/\\\n/g, " ").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));

const refuse = (why: string) => (process.stderr.write(`spp verify: ${why}\n`), 1);

// The issue's Verify block, fetched once and checked against its pin from that same fetch, or the refusal's exit code.
async function pinnedBlock(ref: string): Promise<string | number> {
  const { body } = JSON.parse(await runGh(["issue", "view", ref, "--json", "body"])) as { body: string | null };
  const block = parseTicket(body ?? "").verify;
  if (block === null) throw new Error(`${ref} has no Verify block`);
  const refusal = await checkPin(ref, block);
  return refusal ? refuse(`${refusal.detail}, then run spp verify again. Nothing was run.`) : block;
}

// --print: the pinned block's commands for a skill to run by hand, so its run reads the bytes the check hashed.
async function print(ref: string): Promise<number> {
  const block = await pinnedBlock(ref);
  if (typeof block === "number") return block;
  process.stdout.write(commands(block).map((c) => c + "\n").join(""));
  return 0;
}

async function verify(ref: string): Promise<number> {
  const root = gitOut("rev-parse", "--show-toplevel");
  if (!root) throw new Error("not inside a git repository");
  if (gitOut("status", "--porcelain")) return refuse(`uncommitted changes. Commit them, then run spp verify ${ref} on the committed tree.`);
  const block = await pinnedBlock(ref);
  if (typeof block === "number") return block;
  let failed = false;
  for (const cmd of commands(block)) {
    // The command's own output goes to stderr, so stdout carries only the pass and fail lines.
    const ok = spawnSync("bash", ["-c", cmd], { cwd: root, stdio: ["ignore", 2, 2] }).status === 0;
    process.stdout.write(`${ok ? "pass" : "fail"}: ${cmd}\n`);
    failed ||= !ok;
  }
  const note = `${failed ? "failed" : "verified"} ${new Date().toISOString()}`;
  if (gitOut("notes", "--ref=sdd-verify", "add", "-f", "-m", note, "HEAD") === null) throw new Error("could not write the sdd-verify note on HEAD");
  return failed ? 1 : 0;
}

/**
 * Why the stop gate refuses to let the session in the current directory stop, or null when it may stop. `note --auto`
 * asks it too, since the Stop hook's commands run side by side and a refused stop is no stop to note.
 *
 * @internal
 */
export function stopRefusal(): string | null {
  const n = workerTicket(process.cwd());
  if (n === null) return null;
  const branch = gitOut("branch", "--show-current") || "HEAD";
  if (gitOut("status", "--porcelain")) return `uncommitted changes on ${branch}. Commit them, then run spp verify ${n}.`;
  const note = gitOut("notes", "--ref=sdd-verify", "show", "HEAD") ?? "";
  if (/^(verified|blocked)\b/.test(note)) return null;
  // HEAD equal to or an ancestor of a remote integration branch (feat/*) or the remote default branch (a One-off's
  // base): the worker committed nothing beyond the base it was cut from (say, a readiness stop), so there is nothing
  // to verify and no claim of its own to hand back. Any other remote branch (wip, another sdd/*) does not count.
  const bases = (gitOut("for-each-ref", "--contains", "HEAD", "--format=%(refname)", "refs/remotes") ?? "").split("\n");
  const defaults = (gitOut("for-each-ref", "--format=%(symref)", "refs/remotes/*/HEAD") ?? "").split("\n");
  if (bases.some((r) => r && (/^refs\/remotes\/[^/]+\/feat\//.test(r) || defaults.includes(r)))) return null;
  const handBack = `If you are stopping BLOCKED, hand the ticket back (spp hand-back ${n} <route> --reason ...), push what is committed, then record it: git notes --ref=sdd-verify add -f -m blocked HEAD`;
  if (note.startsWith("failed")) return `Verify failed on HEAD of ${branch}. Fix it and run spp verify ${n} again. ${handBack}`;
  return `Verify not run on HEAD of ${branch}. Run spp verify ${n} on the committed tree. ${handBack}`;
}

async function check(): Promise<number> {
  // stop_hook_active is ignored on purpose: a second stop is just as unverified, and Claude Code caps the loop itself
  // (eight blocked stops in a row end the turn).
  const input = await readHookInput();
  enterHookCwd(input);
  const why = stopRefusal();
  if (!why) return 0;
  // A Stop payload from an orchestrator whose shell was left in a worker's worktree is the same as the worker's own,
  // so the refusal names the way out. A subagent (SubagentStop) stands in the worktree it was given.
  const wayOut = input.hook_event_name === "Stop" ? " If this is a worker's worktree and you are not that worker, cd back to your own checkout and stop again." : "";
  process.stderr.write(`spp verify: ${why}${wayOut}\n`);
  return 2;
}

/**
 * Runs a Sub-issue's Verify block, or checks that `HEAD` carries a passing run.
 *
 * @param args - The Sub-issue (an issue number in the current repo or an issue URL), then `--print` to print its
 *   pinned commands instead of running them; or `--check` alone.
 * @returns With an issue: 0 when every command passed; 1 when any failed, the issue has no Verify block, the block
 *   is unpinned or differs from its pin, or the tree is dirty (those last three run nothing and record nothing). With
 *   `--print`: 0 when it printed the pinned commands; 1, printing nothing, when the block is missing, unpinned or
 *   differs from its pin. With `--check`: 0 to let the session stop, 2 to block it, with the reason on stderr. 2 on a
 *   usage error, with the usage on stderr.
 * @example
 * ```bash
 * spp verify 265
 * spp verify 265 --print
 * ```
 */
export async function run(args: string[]): Promise<number> {
  if (args.length === 1 && args[0] === "--check") return check();
  if (args.length === 1 && isIssueRef(args[0])) return verify(args[0]);
  if (args.length === 2 && args[1] === "--print" && isIssueRef(args[0])) return print(args[0]);
  process.stderr.write(USAGE);
  return 2;
}
