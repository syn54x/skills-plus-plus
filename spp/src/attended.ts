// Whether this run is an Attended session (ADR 0012). spp names no harness variable: it reads one table at a fixed
// path, the plugin's hooks/attended.json, which maps each variable that marks an attended session to its value, per
// the portability law. Today it holds Claude Code's; a port adds its own entries there. A missing or unreadable
// table, or no variable matching it, counts as not attended.
//
// The decision is made once, where the work starts: `spp dispatch` writes it to one file per ticket in spp's state
// directory, and a worker (see workerTicket) trusts its ticket's file over its own environment while the issue is
// open. Only the issue closing ends it: the same worker is resumed after its slice merges and after a needs-info
// hand-back, so a worker that finds the issue closed deletes the file, and nothing else does.
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname } from "node:path";
import { runGhSync } from "./gh.ts";
import { notesFile } from "./notes-log.ts";

// process.env will do; an empty HOME falls back to the user's home folder.
type StateEnv = { XDG_STATE_HOME?: string; HOME?: string };

// From spp/src the plugin's hooks/ is two folders up; from the npm package's dist/, one (package.json ships the table).
const TABLE = new URL(import.meta.url.endsWith(".ts") ? "../../hooks/attended.json" : "../hooks/attended.json", import.meta.url);

// owner__repo.attended/<N> in the notes log's directory: one file per ticket, so no write ever reads another's.
const attendedFile = (env: StateEnv, repo: string, ticket: number): string =>
  `${notesFile({ XDG_STATE_HOME: env.XDG_STATE_HOME, HOME: env.HOME || homedir() }, repo).replace(/\.jsonl$/, ".attended")}/${ticket}`;

/** Records the attended decision for `ticket`'s worker, replacing any earlier one for that ticket. */
export function passDecision(env: StateEnv, repo: string, ticket: number, attended: boolean): void {
  const file = attendedFile(env, repo, ticket);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${attended}\n`);
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

// hooks/board/register.tsx mirrors these two, and spp/test/attended.test.ts checks they stay the same.
const WORKER_BRANCH = /^sdd\/(\d+)-|^sdd-(\d+)$/;
const WORKER_FOLDER = /^sdd-(\d+)$/;

/**
 * The ticket a worker in `dir` builds: N from an `sdd/<N>-` branch or an `sdd-<N>` branch (the desktop driver's),
 * else from a checkout whose folder is `sdd-<N>` (what `claude --bg --worktree sdd-<N>` makes, before the worker
 * cuts its branch). Null for any other checkout.
 * The one place that knows what a worker looks like.
 */
export function workerTicket(dir: string): number | null {
  const git = (...args: string[]) => spawnSync("git", args, { cwd: dir, encoding: "utf8" }).stdout?.trim() ?? "";
  const branch = WORKER_BRANCH.exec(git("branch", "--show-current"));
  const n = branch?.[1] ?? branch?.[2] ?? WORKER_FOLDER.exec(basename(git("rev-parse", "--show-toplevel")))?.[1];
  return n ? Number(n) : null;
}

// Each issue's state, read once per process: every Signal a command records asks again.
const states = new Map<string, string | null>();

// The passed decision, honoured only while the ticket's issue is open (a One-off is merged by a person, never by
// spp merge). A closed issue deletes the file; a gh failure means no decision, never an error.
function liveDecision(env: StateEnv, repo: string, ticket: number): boolean | undefined {
  const decision = passed(env, repo, ticket);
  if (decision === undefined) return undefined;
  const key = `${repo}#${ticket}`;
  if (!states.has(key)) {
    try {
      states.set(key, (JSON.parse(runGhSync(["issue", "view", String(ticket), "-R", repo, "--json", "state"])) as { state: string }).state);
    } catch {
      states.set(key, null);
    }
  }
  const state = states.get(key);
  if (state === "CLOSED") {
    try {
      rmSync(attendedFile(env, repo, ticket), { force: true });
    } catch {} // a file that will not go is ignored all the same while the issue stays closed
  }
  return state === "OPEN" ? decision : undefined;
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
  const decision = ticket ? liveDecision(env, worker!.repo, ticket) : undefined;
  return decision ?? harnessSaysAttended(env);
}
