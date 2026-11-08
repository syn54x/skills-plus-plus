// Whether this run is an Attended session (ADR 0012). The one place spp reads the harness's signal, per the
// portability law; skills/build/CLAUDE-CODE.md names the variables. Neither is documented by Anthropic, so anything
// unrecognised counts as not attended.
//
// The decision is made once, where the work starts: `spp dispatch` writes it to a file per repository in spp's state
// directory, keyed by issue number, and a worker on branch `sdd/<N>-...` trusts that entry over its own environment.
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname } from "node:path";
import { notesFile } from "./notes-log.ts";

// owner__repo.attended.json in the notes log's directory.
export const attendedFile = (env: { XDG_STATE_HOME?: string; HOME: string }, repo: string): string =>
  notesFile(env, repo).replace(/\.jsonl$/, ".attended.json");

// The decision file's entries; {} when it is missing or not a JSON object.
function decisions(env: { XDG_STATE_HOME?: string; HOME: string }, repo: string): Record<string, unknown> {
  try {
    const d = JSON.parse(readFileSync(attendedFile(env, repo), "utf8")) as unknown;
    return d && typeof d === "object" && !Array.isArray(d) ? (d as Record<string, unknown>) : {};
  } catch {
    return {}; // missing or unparseable: the harness signal decides, never fatal
  }
}

// Sets `ticket`'s entry and keeps the others.
export function passDecision(env: { XDG_STATE_HOME?: string; HOME: string }, repo: string, ticket: number, attended: boolean): void {
  const file = attendedFile(env, repo);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify({ ...decisions(env, repo), [String(ticket)]: attended }) + "\n");
}

export function isAttended(env: NodeJS.ProcessEnv, worker?: { repo: string; dir: string }): boolean {
  if (env.CI) return false;
  if (worker) {
    const branch = spawnSync("git", ["branch", "--show-current"], { cwd: worker.dir, encoding: "utf8" }).stdout?.trim() ?? "";
    const n = /^sdd\/(\d+)-/.exec(branch)?.[1];
    const passed = n ? decisions({ XDG_STATE_HOME: env.XDG_STATE_HOME, HOME: env.HOME || homedir() }, worker.repo)[n] : undefined;
    if (typeof passed === "boolean") return passed;
  }
  return env.CLAUDE_CODE_SESSION_ATTENDED === "1";
}
