/**
 * `spp status <epic> [--json]` prints every Sub-issue of an Epic with its state, grouped by Layer, from one GraphQL
 * query. Each line is the ticket's state, its number and title, and its pull request when it has one; a blocking
 * cycle gets a group of its own. With `--json` it prints the whole {@link EpicState} instead.
 *
 * @module
 */
import { derive, type EpicState, refIn } from "../derive.ts";
import { fetchSnapshot } from "../fetch-snapshot.ts";
import { attachNotes } from "../notes.ts";

export type { EpicState, Ticket, TicketState } from "../derive.ts";
export type { Pr, PrState } from "../snapshot.ts";
export type { Verdict } from "../verdict.ts";

/** The usage text `spp status --help` prints. */
export const USAGE = "usage: spp status <epic number | issue URL> [--json]\n";

function render(s: EpicState): string {
  const ref = refIn(s.epic.repo);
  const byUrl = new Map(s.tickets.map((t) => [t.url, t]));
  const line = (url: string) => {
    const t = byUrl.get(url)!;
    return `  ${t.state.padEnd(11)} ${ref(t.url)} ${t.title}${t.pr ? ` (PR ${ref(t.pr.url)})` : ""}`;
  };
  const groups: [string, string[]][] = s.layers.map((urls, i) => [`Layer ${i}`, urls]);
  if (s.cycle.length) groups.push(["Cycle", s.cycle]);
  const lines = [`${s.epic.repo}#${s.epic.number} ${s.epic.title}`, ...groups.flatMap(([head, urls]) => [head, ...urls.map(line)])];
  return lines.join("\n") + "\n";
}

/**
 * The Epic's derived state with each ticket's latest local note, or null when `epic` is not a number or issue URL.
 *
 * @internal
 */
export async function fetchState(epic: string): Promise<EpicState | null> {
  const snapshot = await fetchSnapshot(epic);
  return snapshot && attachNotes(derive(snapshot));
}

/**
 * Prints the Epic's state.
 *
 * @param args - The Epic (an issue number in the current repo or an issue URL), and `--json` for the
 *   {@link EpicState} shape.
 * @returns 0 when it printed the state; 2 on a usage error, with the usage on stderr. A `gh` error exits 1 with
 *   the reason on stderr.
 * @example
 * ```bash
 * spp status 197
 * spp status https://github.com/syn54x/skills-plus-plus/issues/197 --json
 * ```
 */
export async function run(args: string[]): Promise<number> {
  const rest = args.filter((a) => a !== "--json");
  const state = rest.length === 1 ? await fetchState(rest[0]) : null;
  if (!state) {
    process.stderr.write(USAGE);
    return 2;
  }
  process.stdout.write(args.includes("--json") ? JSON.stringify(state, null, 2) + "\n" : render(state));
  return 0;
}
