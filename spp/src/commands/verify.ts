/**
 * `spp verify` runs a Sub-issue's Verify block and records the result on `HEAD`, and as a stop hook it holds a worker
 * on an `sdd/*` branch until that record exists. It has no `--json`.
 *
 * Its two forms:
 *
 * - `spp verify <issue>` runs the Sub-issue's Verify block from the repository root, one command per line (a trailing
 *   backslash continues a line), prints `pass:` or `fail:` per command with the commands' own output on stderr, and
 *   records the result as a note under `refs/notes/sdd-verify` on `HEAD`. It runs only a block that matches the pin
 *   hardening wrote in the progress comment (`spp lint ticket <issue> --pin`), since anyone who can edit the issue
 *   can change the block after it was approved (ADR 0009), and only on a clean tree, so the note speaks for `HEAD`.
 * - `spp verify --check` is the `Stop` and `SubagentStop` hook. On an `sdd/*` branch it blocks the stop when the tree
 *   is dirty or `HEAD` has no passing (or `blocked`) note, unless `HEAD` adds nothing to an integration branch or the
 *   default branch; on any other branch it passes unchecked.
 *
 * @module
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { runGh } from "../gh.ts";
import { find, parseIssue, readTrailer } from "../markers.ts";
import { isIssueRef, parseTicket } from "../ticket.ts";
import { MARKER } from "./progress.ts";

/** The usage text `spp verify --help` prints. */
export const USAGE = `usage: spp verify <issue number | issue URL>
       spp verify --check
The first runs the ticket's Verify block and records the result on HEAD. --check exits 2 on an sdd/* branch whose
HEAD has no passing record or whose tree is dirty; as a stop hook it reads the hook payload on stdin.
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

/**
 * The pin of a Verify block: the sha256 of the block as `parseTicket` reads it, in hex.
 *
 * @internal
 */
export const pinOf = (block: string) => createHash("sha256").update(block).digest("hex");

// One command per line; a trailing backslash continues the line, and blank and comment lines are skipped.
// shortcut: each line runs in its own shell, so a `cd` on its own line does not carry to the next; join them with && instead.
const commands = (block: string) =>
  block.replace(/\\\n/g, " ").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));

async function verify(ref: string): Promise<number> {
  const root = gitOut("rev-parse", "--show-toplevel");
  if (!root) throw new Error("not inside a git repository");
  const refuse = (why: string) => (process.stderr.write(`spp verify: ${why}\n`), 1);
  if (gitOut("status", "--porcelain")) return refuse(`uncommitted changes. Commit them, then run spp verify ${ref} on the committed tree.`);
  const { body } = JSON.parse(await runGh(["issue", "view", ref, "--json", "body"])) as { body: string | null };
  const block = parseTicket(body ?? "").verify;
  if (block === null) throw new Error(`${ref} has no Verify block`);
  const pin = readTrailer((await find(parseIssue(ref), MARKER))?.body ?? "")?.verifyPin;
  const reharden = `Re-harden it (spp lint ticket ${ref} --pin once the block is approved), then run spp verify again.`;
  if (typeof pin !== "string") return refuse(`the Verify block of ${ref} is not pinned. ${reharden}`);
  if (pin !== pinOf(block)) return refuse(`the Verify block of ${ref} changed since it was hardened, so it is not run. ${reharden}`);
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

async function check(): Promise<number> {
  // stop_hook_active is ignored on purpose: a second stop is just as unverified, and Claude Code caps the loop itself
  // (eight blocked stops in a row end the turn).
  enterHookCwd(await readHookInput());
  const branch = gitOut("branch", "--show-current") ?? "";
  if (!branch.startsWith("sdd/")) return 0;
  const n = /^sdd\/(\d+)/.exec(branch)?.[1] ?? "<N>";
  const block = (why: string) => (process.stderr.write(`spp verify: ${why}\n`), 2);
  if (gitOut("status", "--porcelain")) return block(`uncommitted changes on ${branch}. Commit them, then run spp verify ${n}.`);
  const note = gitOut("notes", "--ref=sdd-verify", "show", "HEAD") ?? "";
  if (/^(verified|blocked)\b/.test(note)) return 0;
  // HEAD equal to or an ancestor of a remote integration branch (feat/*) or the remote default branch (a One-off's
  // base): the worker committed nothing beyond the base it was cut from (say, a readiness stop), so there is nothing
  // to verify and no claim of its own to hand back. Any other remote branch (wip, another sdd/*) does not count.
  const bases = (gitOut("for-each-ref", "--contains", "HEAD", "--format=%(refname)", "refs/remotes") ?? "").split("\n");
  const defaults = (gitOut("for-each-ref", "--format=%(symref)", "refs/remotes/*/HEAD") ?? "").split("\n");
  if (bases.some((r) => r && (/^refs\/remotes\/[^/]+\/feat\//.test(r) || defaults.includes(r)))) return 0;
  const handBack = `If you are stopping BLOCKED, hand the ticket back (spp hand-back ${n} <route> --reason ...), push what is committed, then record it: git notes --ref=sdd-verify add -f -m blocked HEAD`;
  if (note.startsWith("failed")) return block(`Verify failed on HEAD of ${branch}. Fix it and run spp verify ${n} again. ${handBack}`);
  return block(`Verify not run on HEAD of ${branch}. Run spp verify ${n} on the committed tree. ${handBack}`);
}

/**
 * Runs a Sub-issue's Verify block, or checks that `HEAD` carries a passing run.
 *
 * @param args - The Sub-issue (an issue number in the current repo or an issue URL), or `--check` alone.
 * @returns With an issue: 0 when every command passed; 1 when any failed, the issue has no Verify block, the block
 *   is unpinned or differs from its pin, or the tree is dirty (those last three run nothing and record nothing). With
 *   `--check`: 0 to let the session stop, 2 to block it, with the reason on stderr. 2 on a usage error, with the
 *   usage on stderr.
 * @example
 * ```bash
 * spp verify 265
 * ```
 */
export async function run(args: string[]): Promise<number> {
  if (args.length === 1 && args[0] === "--check") return check();
  if (args.length === 1 && isIssueRef(args[0])) return verify(args[0]);
  process.stderr.write(USAGE);
  return 2;
}
