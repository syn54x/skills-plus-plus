// The local notes log: one JSONL file per repository in spp's own state directory, outside every repository.
// Workers append one-line notes; `spp note --list` and `spp status` read the latest per ticket.
import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { EpicState } from "./derive.ts";

export type Note = { repo: string; ticket: number; text: string; at: string; milestone: boolean };

// $XDG_STATE_HOME/spp, else ~/.local/state/spp.
const stateDir = () => join(process.env.XDG_STATE_HOME || join(homedir(), ".local", "state"), "spp");

// owner/repo becomes owner__repo, so each repository has one flat file.
const logFile = (repo: string) => join(stateDir(), `${repo.replace("/", "__")}.jsonl`);

// The current checkout's repository, from its origin remote (a plain note makes no GitHub call, so gh is not asked).
export function currentRepo(): string {
  const url = spawnSync("git", ["remote", "get-url", "origin"], { encoding: "utf8" }).stdout.trim();
  const m = /github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?\/?$/.exec(url);
  if (!m) throw new Error("cannot tell this checkout's GitHub repository from its origin remote; pass the ticket as an issue URL");
  return m[1];
}

export function appendNote(repo: string, ticket: number, text: string, milestone: boolean): Note {
  const note: Note = { repo, ticket, text, at: new Date().toISOString(), milestone };
  mkdirSync(stateDir(), { recursive: true });
  appendFileSync(logFile(repo), JSON.stringify(note) + "\n");
  return note;
}

// The newest note of each ticket in a repository, by ticket number; none when the log does not exist yet.
function latest(repo: string): Map<number, Note> {
  const file = logFile(repo);
  const notes = new Map<number, Note>();
  if (!existsSync(file)) return notes;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    try {
      const n = JSON.parse(line) as Note;
      notes.set(n.ticket, n);
    } catch {} // a torn or blank line is skipped, never fatal
  }
  return notes;
}

// Fills each ticket's `note` with its latest note. Done after `derive`, so `derive` stays pure.
export function attachNotes(state: EpicState): EpicState {
  const byRepo = new Map<string, Map<number, Note>>();
  for (const t of state.tickets) {
    if (!byRepo.has(t.repo)) byRepo.set(t.repo, latest(t.repo));
    const n = byRepo.get(t.repo)!.get(t.number);
    t.note = n ? { text: n.text, at: n.at } : null;
  }
  return state;
}
