/**
 * `spp wait <epic> [--interval SECONDS] [--timeout SECONDS]` polls the Epic's state every interval (default 120
 * seconds) and exits when something changes, with one line per change: a ticket's state (`#12 claimed -> pr-open`),
 * or a Fix pull request that appeared, merged or went (`#77 OPEN -> MERGED`, `absent` on either side), got a new head
 * or a gate verdict (`#77 OPEN -> OPEN (new head)`, `(gate-pass)`). It reads no session list: the build learns of its
 * own workers finishing from them, and `spp next --resume` asks about the ones a dead session lost. When nothing
 * changes for `--timeout` seconds (default 1800) it exits with one `heartbeat:` line, so the orchestrator never
 * sleeps on a change it cannot see. Run it in the background so its exit wakes the orchestrator. It has no `--json`.
 *
 * @module
 */
import { setTimeout as sleep } from "node:timers/promises";
import { type EpicState, refIn } from "../derive.ts";
import { flagPairs, guarded, parseIssue, UsageError } from "../markers.ts";
import { fetchState } from "./status.ts";

/** The usage text `spp wait --help` prints. */
export const USAGE = `usage: spp wait <epic number | issue URL> [--interval SECONDS] [--timeout SECONDS]
Exits 0 with one line per change: a ticket's state ("#12 claimed -> pr-open") or a fix pull request's
("#77 OPEN -> MERGED"); or, when nothing changed for --timeout seconds, one "heartbeat:" line.
The interval defaults to 120 seconds and the timeout to 1800.
`;

function changes(before: EpicState, now: EpicState): string[] {
  const ref = refIn(now.epic.repo);
  const was = new Map(before.tickets.map((t) => [t.url, t.state]));
  const tickets = now.tickets.filter((t) => was.get(t.url) !== t.state).map((t) => `${ref(t.url)} ${was.get(t.url) ?? "absent"} -> ${t.state}`);
  // A fix appears, merges or goes (closed, retargeted, or its author no longer trusted), gets a new head after its fix
  // round, or gets the gate's verdict on that head.
  const fixWas = new Map(before.fixes.map((f) => [f.url, f]));
  const fixNow = new Map(now.fixes.map((f) => [f.url, f]));
  const fixes = [...new Set([...fixWas.keys(), ...fixNow.keys()])].flatMap((u) => {
    const [a, b] = [fixWas.get(u), fixNow.get(u)];
    if (a?.state === b?.state && a?.headSha === b?.headSha && a?.gate === b?.gate) return [];
    const why = a && b && a.state === b.state ? ` (${a.headSha !== b.headSha ? "new head" : b.gate})` : "";
    return [`${ref(u)} ${a?.state ?? "absent"} -> ${b?.state ?? "absent"}${why}`];
  });
  return [...tickets, ...fixes];
}

const seconds = (rest: string[], flag: string, fallback: number) => {
  const n = Number(flagPairs(rest, ["--interval", "--timeout"]).find(([f]) => f === flag)?.[1] ?? fallback);
  if (!Number.isFinite(n) || n < 0) throw new UsageError(`${flag} takes a number of seconds, 0 or more`);
  return n;
};

/**
 * Waits until the Epic changes, or the timeout passes.
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
    const poll = async (): Promise<EpicState> => (await fetchState(epic))!;
    const print = (lines: string[]) => process.stdout.write(lines.map((l) => l + "\n").join(""));
    const deadline = Date.now() + timeout * 1000;
    let before = await poll();
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
