/**
 * `spp wait <epic> [--interval SECONDS] [--timeout SECONDS]` polls the Epic's state and the `claude` session list
 * every interval (default 120 seconds) and exits when something changes, with one line per change: a ticket's state
 * (`#12 claimed -> pr-open`), a Fix pull request that appeared, merged or went (`#77 OPEN -> MERGED`, `absent` on
 * either side) or one of its workers that stopped working (`t-12 done`). The first poll also reports a
 * claimed, unassigned ticket with no pull request whose worker session is listed but no longer live, since it stopped
 * before the wait began. When nothing changes for `--timeout` seconds (default 1800) it exits with one `heartbeat:`
 * line, so a worker that died unseen never leaves the orchestrator asleep. Run it in the background so its exit wakes
 * the orchestrator. It has no `--json`.
 *
 * @module
 */
import { setTimeout as sleep } from "node:timers/promises";
import { type EpicState, refIn } from "../derive.ts";
import { flagPairs, guarded, parseIssue, UsageError } from "../markers.ts";
import { lostWorker, type Session } from "../plan-next.ts";
import { readSessions } from "./next.ts";
import { fetchState } from "./status.ts";

/** The usage text `spp wait --help` prints. */
export const USAGE = `usage: spp wait <epic number | issue URL> [--interval SECONDS] [--timeout SECONDS]
Exits 0 with one line per change: a ticket's state ("#12 claimed -> pr-open"), a fix pull request's ("#77 OPEN -> MERGED")
or a worker that stopped working ("t-12 done"), a claimed ticket's worker that stopped before opening its PR included; or, when nothing changed
for --timeout seconds, one "heartbeat:" line. The interval defaults to 120 seconds and the timeout to 1800.
`;

type Poll = { state: EpicState; sessions: Session[] };
const BUSY = ["working", "busy"];

const sessionState = (s: Session | undefined) => s?.state ?? s?.status;

function changes(before: Poll, now: Poll): string[] {
  const ref = refIn(now.state.epic.repo);
  const was = new Map(before.state.tickets.map((t) => [t.url, t.state]));
  const tickets = now.state.tickets.filter((t) => was.get(t.url) !== t.state).map((t) => `${ref(t.url)} ${was.get(t.url) ?? "absent"} -> ${t.state}`);
  // A fix appears, merges or goes (closed, retargeted, or its author no longer trusted).
  const fixWas = new Map(before.state.fixes.map((f) => [f.url, f.state]));
  const fixNow = new Map(now.state.fixes.map((f) => [f.url, f.state]));
  const fixes = [...new Set([...fixWas.keys(), ...fixNow.keys()])].filter((u) => fixWas.get(u) !== fixNow.get(u)).map((u) => `${ref(u)} ${fixWas.get(u) ?? "absent"} -> ${fixNow.get(u) ?? "absent"}`);
  // A ticket's workers: the progress comment's worker and the name spp dispatch gives, t-<N>.
  const names = new Set(now.state.tickets.flatMap((t) => [t.worker, `t-${t.number}`]).filter((n): n is string => !!n));
  const workers = now.sessions
    .filter((s) => s.name && names.has(s.name))
    .filter((s) => {
      const st = sessionState(s);
      return st && !BUSY.includes(st) && st !== sessionState(before.sessions.find((b) => b.name === s.name));
    })
    .map((s) => `${s.name} ${sessionState(s)}`);
  return [...tickets, ...fixes, ...workers];
}

// Lost workers (see lostWorker): they stopped before the first poll could see them go, and spp next hands their tickets
// back. A worker that opened its pull request is done by design, and a person's assignment is a live hold.
function stopped(p: Poll): string[] {
  return p.state.tickets.flatMap((t) => {
    const s = lostWorker(t, p.sessions);
    return s ? [`${s.name} ${sessionState(s)}`] : [];
  });
}

const seconds = (rest: string[], flag: string, fallback: number) => {
  const n = Number(flagPairs(rest, ["--interval", "--timeout"]).find(([f]) => f === flag)?.[1] ?? fallback);
  if (!Number.isFinite(n) || n < 0) throw new UsageError(`${flag} takes a number of seconds, 0 or more`);
  return n;
};

/**
 * Waits until the Epic or one of its workers changes, or the timeout passes.
 *
 * @param args - The Epic (an issue number in the current repo or an issue URL), then `--interval SECONDS` and
 *   `--timeout SECONDS`.
 * @returns 0 once something changed or the timeout passed; 2 on a usage error, with the usage on stderr; 1 when `gh`
 *   fails, with the reason on stderr.
 * @example
 * ```bash
 * spp wait 197 --interval 60
 * ```
 */
export function run(args: string[]): Promise<number> {
  return guarded(() => "wait", USAGE, async () => {
    const [arg, ...rest] = args;
    if (arg === undefined) throw new UsageError("");
    // One snapshot costs about 26 of GitHub's 5,000 GraphQL points an hour, and the board polls too: keep the default long.
    const interval = seconds(rest, "--interval", 120);
    const timeout = seconds(rest, "--timeout", 1800);
    const epic = parseIssue(arg).arg;
    const poll = async (): Promise<Poll> => ({ state: (await fetchState(epic))!, sessions: readSessions() });
    const print = (lines: string[]) => process.stdout.write(lines.map((l) => l + "\n").join(""));
    const deadline = Date.now() + timeout * 1000;
    let before = await poll();
    const dead = stopped(before);
    if (dead.length) return void print(dead);
    for (;;) {
      await sleep(interval * 1000);
      const now = await poll();
      const found = changes(before, now);
      if (found.length) return void print(found);
      if (Date.now() >= deadline) return void print([`heartbeat: nothing changed in ${timeout}s`]);
      before = now;
    }
  });
}
