/**
 * `spp wait <epic> [--interval SECONDS]` polls the Epic's state and the `claude` session list every interval
 * (default 30 seconds) and exits when something changes, with one line per change: a ticket's state
 * (`#12 claimed -> pr-open`) or one of its workers that stopped working (`t-12 done`). Run it in the background so its
 * exit wakes the orchestrator. It has no `--json`.
 *
 * @module
 */
import { setTimeout as sleep } from "node:timers/promises";
import { type EpicState, refIn } from "../derive.ts";
import { flagPairs, guarded, parseIssue, UsageError } from "../markers.ts";
import type { Session } from "../plan-next.ts";
import { readSessions } from "./next.ts";
import { fetchState } from "./status.ts";

/** The usage text `spp wait --help` prints. */
export const USAGE = `usage: spp wait <epic number | issue URL> [--interval SECONDS]
Exits 0 with one line per change: a ticket's state ("#12 claimed -> pr-open") or a worker that stopped working
("t-12 done"). The interval defaults to 30 seconds.
`;

type Poll = { state: EpicState; sessions: Session[] };
const BUSY = ["working", "busy"];

const sessionState = (s: Session | undefined) => s?.state ?? s?.status;

function changes(before: Poll, now: Poll): string[] {
  const ref = refIn(now.state.epic.repo);
  const was = new Map(before.state.tickets.map((t) => [t.url, t.state]));
  const tickets = now.state.tickets.filter((t) => was.get(t.url) !== t.state).map((t) => `${ref(t.url)} ${was.get(t.url) ?? "absent"} -> ${t.state}`);
  // A ticket's workers: the progress comment's worker and the name spp dispatch gives, t-<N>.
  const names = new Set(now.state.tickets.flatMap((t) => [t.worker, `t-${t.number}`]).filter((n): n is string => !!n));
  const workers = now.sessions
    .filter((s) => s.name && names.has(s.name))
    .filter((s) => {
      const st = sessionState(s);
      return st && !BUSY.includes(st) && st !== sessionState(before.sessions.find((b) => b.name === s.name));
    })
    .map((s) => `${s.name} ${sessionState(s)}`);
  return [...tickets, ...workers];
}

/**
 * Waits until the Epic or one of its workers changes.
 *
 * @param args - The Epic (an issue number in the current repo or an issue URL), then `--interval SECONDS`.
 * @returns 0 once something changed; 2 on a usage error, with the usage on stderr; 1 when `gh` fails, with the
 *   reason on stderr.
 * @example
 * ```bash
 * spp wait 197 --interval 60
 * ```
 */
export function run(args: string[]): Promise<number> {
  return guarded(() => "wait", USAGE, async () => {
    const [arg, ...rest] = args;
    if (arg === undefined) throw new UsageError("");
    const interval = Number(flagPairs(rest, ["--interval"]).find(([f]) => f === "--interval")?.[1] ?? 30);
    if (!Number.isFinite(interval) || interval < 0) throw new UsageError("--interval takes a number of seconds, 0 or more");
    const epic = parseIssue(arg).arg;
    const poll = async (): Promise<Poll> => ({ state: (await fetchState(epic))!, sessions: readSessions() });
    let before = await poll();
    for (;;) {
      await sleep(interval * 1000);
      const now = await poll();
      const found = changes(before, now);
      if (found.length) {
        process.stdout.write(found.map((l) => l + "\n").join(""));
        return 0;
      }
      before = now;
    }
  });
}
