/**
 * `spp status <epic> [--json]` prints every Sub-issue of an Epic with its state, grouped by Layer, from one GraphQL
 * query. Each line is the ticket's state, its number and title, and its pull request when it has one; a blocking
 * cycle gets a group of its own. The Epic's Fix pull requests (trusted pull requests into its integration branch that
 * close no Sub-issue, open or merged) follow under `Fixes`, one line each with its state, its number and the Sub-issue
 * its `Refs` line names or `unattributed`, and the header line ends with the open count, as in `(3 fixes open)`;
 * with no fixes it prints neither. With `--json` it prints the whole {@link EpicState} instead, the fixes as `fixes`.
 *
 * @module
 */
import { derive, type EpicState, refIn } from "../derive.ts";
import { fetchSnapshot } from "../fetch-snapshot.ts";
import { attachNotes } from "../notes.ts";

export type { EpicState, Fix, Ticket, TicketState } from "../derive.ts";
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
  const open = s.fixes.filter((f) => f.state === "OPEN").length;
  const header = `${s.epic.repo}#${s.epic.number} ${s.epic.title}${s.fixes.length ? ` (${open} ${open === 1 ? "fix" : "fixes"} open)` : ""}`;
  const fixes = s.fixes.map((f) => `  ${f.state.toLowerCase().padEnd(11)} ${ref(f.url)} ${f.ticket ? `Refs ${ref(f.ticket)}` : "unattributed"}`);
  const lines = [header, ...groups.flatMap(([head, urls]) => [head, ...urls.map(line)]), ...(fixes.length ? ["Fixes", ...fixes] : [])];
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
