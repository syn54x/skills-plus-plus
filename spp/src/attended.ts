// Whether this run is an Attended session (ADR 0012). spp names no harness variable: the harness edge lists which
// variables mark an attended session in a data file beside its hooks (hooks/attended.json for Claude Code), per the
// portability law. A missing or unreadable table, or no variable matching it, counts as not attended.
//
// The decision is made once, where the work starts: `spp dispatch` writes it to one file per ticket in spp's state
// directory, and a worker (see workerTicket) trusts its ticket's file over its own environment. `spp merge` and
// `spp hand-back` delete the file, so no decision outlives its worker.
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname } from "node:path";
import { notesFile } from "./notes-log.ts";

// process.env will do; an empty HOME falls back to the user's home folder.
type StateEnv = { XDG_STATE_HOME?: string; HOME?: string };

// From spp/src the plugin's hooks/ is two folders up; the npm package's dist/ ships no hooks/, so it reads as unattended.
const TABLE = new URL(import.meta.url.endsWith(".ts") ? "../../hooks/attended.json" : "../hooks/attended.json", import.meta.url);

// owner__repo.attended/<N> in the notes log's directory: one file per ticket, so no write ever reads another's.
export const attendedFile = (env: StateEnv, repo: string, ticket: number): string =>
  `${notesFile({ XDG_STATE_HOME: env.XDG_STATE_HOME, HOME: env.HOME || homedir() }, repo).replace(/\.jsonl$/, ".attended")}/${ticket}`;

/** Records the attended decision for `ticket`'s worker, replacing any earlier one for that ticket. */
export function passDecision(env: StateEnv, repo: string, ticket: number, attended: boolean): void {
  const file = attendedFile(env, repo, ticket);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${attended}\n`);
}

/** Deletes `ticket`'s passed decision, once its worker is done (merged or handed back). Missing is fine. */
export function forgetDecision(env: StateEnv, repo: string, ticket: number): void {
  rmSync(attendedFile(env, repo, ticket), { force: true });
}

// The passed decision for `ticket`: true or false, undefined when there is none or it is unreadable.
function passed(env: StateEnv, repo: string, ticket: number): boolean | undefined {
  try {
    const text = readFileSync(attendedFile(env, repo, ticket), "utf8").trim();
    return text === "true" ? true : text === "false" ? false : undefined;
  } catch {
    return undefined; // missing: the harness signal decides, never fatal
  }
}

/**
 * The ticket a worker in `dir` builds: N from an `sdd/<N>-` branch, else from a checkout whose folder is `sdd-<N>`
 * (what `claude --bg --worktree sdd-<N>` makes, before the worker cuts its branch). Null for any other checkout.
 * The one place that knows what a worker looks like.
 */
export function workerTicket(dir: string): number | null {
  const git = (...args: string[]) => spawnSync("git", args, { cwd: dir, encoding: "utf8" }).stdout?.trim() ?? "";
  const n = /^sdd\/(\d+)-/.exec(git("branch", "--show-current"))?.[1] ?? /^sdd-(\d+)$/.exec(basename(git("rev-parse", "--show-toplevel")))?.[1];
  return n ? Number(n) : null;
}

// True when any variable the harness edge's table names holds the value it gives.
function harnessSaysAttended(env: NodeJS.ProcessEnv): boolean {
  try {
    const table = (JSON.parse(readFileSync(TABLE, "utf8")) as { attended?: Record<string, string> }).attended ?? {};
    return Object.entries(table).some(([name, value]) => env[name] === value);
  } catch {
    return false;
  }
}

export function isAttended(env: NodeJS.ProcessEnv, worker?: { repo: string; dir: string }): boolean {
  if (env.CI) return false;
  const ticket = worker && workerTicket(worker.dir);
  const decision = ticket ? passed(env, worker!.repo, ticket) : undefined;
  return decision ?? harnessSaysAttended(env);
}
