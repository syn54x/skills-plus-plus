/**
 * `spp wave` plans the next Wave, and records waves, their pull requests and the review panel's rounds on the
 * Epic's one `<!-- sdd-wave -->` comment.
 *
 * Its forms:
 *
 * - `spp wave plan <epic> [--max N] [--json]` runs the parallel safety check over the ready Sub-issues: Files owned
 *   that overlap in one repo, and Consumes and Produces pairs across repos. It prints the tickets that can run
 *   together (at most `--max`, default 4) and the held ones with why; with `--json` it prints {@link WavePlan}. It
 *   writes nothing.
 * - `spp wave <epic> add --n N --tickets ... --workers ... --started ISO8601 --edges ...` records a Wave, replacing
 *   any wave with the same `--n`.
 * - `spp wave <epic> pr --ticket T --pr URL|#n` records a pull request on the last wave holding `--ticket`, given in
 *   the form `add` stored.
 * - `spp wave <epic> panel --round R --verdict V [--report URL] ...` records a review panel round, replacing the
 *   round with the same `--round`.
 *
 * Waves and panel rounds are lists inside the comment's data trailer, so a retried call replaces its own entry and
 * never duplicates one. The writing forms print the comment's URL.
 *
 * @module
 */
import { derive, type EpicState } from "../derive.ts";
import { runGh } from "../gh.ts";
import { type Data, flagPairs, guarded, parseIssue, print, updateMarker, UsageError } from "../markers.ts";
import { parseSnapshot, SNAPSHOT_QUERY } from "../snapshot.ts";
import { DEFAULT_WAVE_MAX } from "../plan-next.ts";
import { parseTicket } from "../ticket.ts";

/** The usage text `spp wave --help` prints. */
export const USAGE = `usage: spp wave plan <epic> [--max N] [--json]
       spp wave <epic> add  --n N --tickets 101,owner/repo#7 --workers w1,w2 --started ISO8601
                             --edges "104<103,owner/repo#7<101" | --edges none
       spp wave <epic> pr    --ticket 101|owner/repo#7 --pr URL|#n
       spp wave <epic> panel --round R --verdict "FIX FIRST"|"HUMAN DECISION"|MERGE [--report URL]
                             [--severity critical=1,important=2,minor=3] [--persona name=count,...] [--dropped D]
wave plan prints the ready tickets that can run together (at most --max, default ${DEFAULT_WAVE_MAX}) and the held ones with why.
wave add replaces every wave with the same --n; wave panel replaces the entry with the same --round
(a round shown but never posted has no --report and renders unposted);
wave pr records the PR on the last wave whose tickets hold --ticket, given in the form wave add stored.
A wave ticket is a number, owner/repo#N or an issue URL, stored and rendered as given.
`;

type Wave = { n: number; tickets: (string | number)[]; workers: string[]; started: string; edges: (string | number)[][]; prs: Record<string, string> };
type Round = { round: number; verdict: string; report: string | null; severity: Record<string, number>; persona: Record<string, number>; dropped: number };
type WaveData = { waves: Wave[]; panel: Round[] };

const T = String.raw`(?:\d+|[\w.-]+/[\w.-]+#\d+|https://github\.com/[\w.-]+/[\w.-]+/issues/\d+)`;
const TICKETS = new RegExp(`^${T}(,${T})*$`);
const EDGES = new RegExp(`^(none|${T}<${T}(,${T}<${T})*)$`);
const COUNTS = /^([\w-]+=\d+(,[\w-]+=\d+)*)?$/;
const FLAGS: Record<string, string[]> = {
  add: ["--n", "--tickets", "--workers", "--started", "--edges"],
  pr: ["--ticket", "--pr"],
  panel: ["--round", "--verdict", "--report", "--severity", "--persona", "--dropped"],
};

const ref = (t: string | number) => (/^\d+$/.test(String(t)) ? `#${t}` : String(t));
const counts = (s: string) => Object.fromEntries(s ? s.split(",").map((kv) => [kv.split("=")[0], Number(kv.split("=")[1])]) : []);

// shortcut: JS lists integer-like object keys in ascending order, so PRs recorded for a higher ticket before a
// lower one render ascending where v1 kept insertion order; switch prs to an entry list if that order ever matters.
function render(data: Data): string {
  const d = data as WaveData;
  return [
    ...d.waves.flatMap((w) => [
      `Wave ${w.n}: ${w.tickets.map(ref).join(", ")} (${w.workers.join(", ")}), started ${w.started}`,
      `Edges added: ${w.edges.length ? w.edges.map((e) => `${e[0]} ← ${e[1]}`).join(", ") : "none"}`,
      ...(Object.keys(w.prs).length ? [`PRs: ${Object.entries(w.prs).map(([t, pr]) => `${ref(t)} → ${pr}`).join(", ")}`] : []),
    ]),
    ...d.panel.map((p) => `Panel round ${p.round}: ${p.verdict} (${p.report ?? "unposted"})`),
  ].join("\n");
}

// The merge for each operation, from its flags.
function merger(op: string, f: Record<string, string>): (d: WaveData) => void {
  if (op === "add") {
    if (!/^\d+$/.test(f["--n"] ?? "")) throw new UsageError("wave add needs --n N");
    if (!TICKETS.test(f["--tickets"] ?? "")) throw new UsageError("wave add needs --tickets 101,owner/repo#7,...");
    if (!f["--workers"]) throw new UsageError("wave add needs --workers w1,w2");
    if (!f["--started"]) throw new UsageError("wave add needs --started ISO8601");
    if (!EDGES.test(f["--edges"] ?? "")) throw new UsageError('wave add needs --edges "104<103,..." or --edges none');
    const n = Number(f["--n"]);
    const edges = f["--edges"] === "none" ? [] : f["--edges"].split(",").map((e) => e.split("<"));
    const wave: Wave = { n, tickets: f["--tickets"].split(","), workers: f["--workers"].split(","), started: f["--started"], edges, prs: {} };
    // A retried add replaces every wave with the same n and keeps the PRs recorded on any of them, a later one winning.
    return (d) => {
      wave.prs = Object.assign({}, ...d.waves.filter((w) => w.n === n).map((w) => w.prs));
      d.waves = [...d.waves.filter((w) => w.n !== n), wave].sort((a, b) => a.n - b.n);
    };
  }
  if (op === "pr") {
    const ticket = f["--ticket"] ?? "";
    if (!new RegExp(`^${T}$`).test(ticket)) throw new UsageError("wave pr needs --ticket N|owner/repo#N|URL");
    if (!f["--pr"]) throw new UsageError("wave pr needs --pr URL|#n");
    return (d) => {
      const w = d.waves.findLast((w) => w.tickets.some((t) => String(t) === ticket));
      if (!w) throw new UsageError(`no wave holds ticket ${ticket}`);
      w.prs[ticket] = f["--pr"];
    };
  }
  const round = f["--round"] ?? "";
  const dropped = f["--dropped"] ?? "0";
  if (!/^\d+$/.test(round)) throw new UsageError("wave panel needs --round R");
  if (!["FIX FIRST", "HUMAN DECISION", "MERGE"].includes(f["--verdict"])) throw new UsageError('wave panel needs --verdict "FIX FIRST"|"HUMAN DECISION"|MERGE');
  if (!COUNTS.test(f["--severity"] ?? "")) throw new UsageError("--severity takes name=count,...");
  if (!COUNTS.test(f["--persona"] ?? "")) throw new UsageError("--persona takes name=count,...");
  if (!/^\d+$/.test(dropped)) throw new UsageError("--dropped takes a count");
  const entry: Round = {
    round: Number(round),
    verdict: f["--verdict"],
    report: f["--report"] || null,
    severity: counts(f["--severity"] ?? ""),
    persona: counts(f["--persona"] ?? ""),
    dropped: Number(dropped),
  };
  // A retried round replaces the entry with the same round.
  return (d) => {
    d.panel = [...d.panel.filter((p) => p.round !== entry.round), entry].sort((a, b) => a.round - b.round);
  };
}

// ---- wave plan: the parallel safety check over the ready tickets ----

/** The next Wave: the `--json` shape of `spp wave plan`. A ticket is its number, or `owner/repo#N` outside the Epic's repo. */
export type WavePlan = {
  /** The ready tickets that can run together, lower Layer and lower number first. */
  wave: string[];
  /** The ready tickets left out, each with why: a shared path, a Consumes and Produces pair, no Files owned, or a full wave. */
  held: { ticket: string; reason: string }[];
};
type PlanInput = { id: string; number: number; repo: string; layer: number | null; body: string };

const isGlob = (p: string) => p.includes("*");
const globPrefix = (p: string) => p.slice(0, p.indexOf("*"));
const escapeRe = (s: string) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
// `**` crosses directories, `*` stays inside one; a path ending in `/` is a directory and covers everything under it.
const asGlob = (p: string) => (p.endsWith("/") ? p + "**" : p);
const globRegExp = (g: string) => new RegExp("^" + g.split("**").map((part) => part.split("*").map(escapeRe).join("[^/]*")).join(".*") + "$");

function overlaps(a: string, b: string): boolean {
  [a, b] = [asGlob(a), asGlob(b)];
  if (!isGlob(a) && !isGlob(b)) return a === b;
  if (isGlob(a) && isGlob(b)) return globPrefix(a).startsWith(globPrefix(b)) || globPrefix(b).startsWith(globPrefix(a));
  return isGlob(a) ? globRegExp(a).test(b) : globRegExp(b).test(a);
}

// What an Interfaces line names: each code span, by its leading identifier when it is a signature (`f(x): T` is f).
// shortcut: names are compared as written, and a Consumes with no code span is caught only through its `#N` or
// `owner/repo#N` reference; a ticket that consumes an unnamed thing with no reference to its producer is not held.
const names = (lines: string[]) => lines.flatMap((l) => [...l.matchAll(/`([^`]+)`/g)].map((m) => /^([A-Za-z_$][\w$.]*)\s*[(:<]/.exec(m[1])?.[1] ?? m[1].trim()));
const references = (lines: string[], repo: string) =>
  lines.flatMap((l) => [...l.matchAll(/(?<![\w/.-])(?:([\w.-]+\/[\w.-]+))?#(\d+)\b/g)].map((m) => `${m[1] ?? repo}#${m[2]}`));

type Parsed = PlanInput & { paths: string[]; consumes: string[]; produces: string[]; refs: string[] };

// Whether `a` consumes something `b` produces, by symbol or by naming b's ticket.
const consumes = (a: Parsed, b: Parsed) => a.refs.includes(`${b.repo}#${b.number}`) || a.consumes.some((n) => b.produces.includes(n));

// Considers the tickets by layer, then number: each joins the wave unless it conflicts with a member already in it,
// so the lower layer and the lower number are the ones kept. Paths are compared per repo; Create counts as well as
// Modify and Test, since a ticket that modifies what another creates must wait for it.
function planWave(tickets: PlanInput[], max: number): WavePlan {
  const parsed: Parsed[] = tickets.map((t) => {
    const ticket = parseTicket(t.body);
    return { ...t, paths: ticket.filesOwned.flatMap((f) => f.paths), consumes: names(ticket.consumes), produces: names(ticket.produces), refs: references(ticket.consumes, t.repo) };
  });
  parsed.sort((a, b) => (a.layer ?? Infinity) - (b.layer ?? Infinity) || a.number - b.number || a.repo.localeCompare(b.repo));
  const wave: Parsed[] = [];
  const held: WavePlan["held"] = [];
  for (const b of parsed) {
    const hold = (reason: string) => held.push({ ticket: b.id, reason });
    if (!b.paths.length) {
      hold("no Files owned");
      continue;
    }
    let reason: string | undefined;
    for (const a of wave) {
      const shared = a.repo === b.repo ? b.paths.find((p) => a.paths.some((q) => overlaps(p, q))) : undefined;
      if (shared) reason = `shares ${shared} with ${a.id}`;
      else if (consumes(b, a)) reason = `consumes ${a.id}`;
      else if (consumes(a, b)) reason = `consumed by ${a.id}`;
      if (reason) break;
    }
    if (reason) hold(reason);
    else if (wave.length >= max) hold("wave full");
    else wave.push(b);
  }
  return { wave: wave.map((t) => t.id), held };
}

/**
 * The wave over the state's ready tickets, reading each one's body for its Files owned and Interfaces.
 *
 * @internal
 */
export async function wavePlan(state: EpicState, max: number): Promise<WavePlan> {
  const ready = await Promise.all(
    state.tickets
      .filter((t) => t.state === "ready")
      .map(async (t) => ({
        id: t.repo === state.epic.repo ? String(t.number) : `${t.repo}#${t.number}`,
        number: t.number,
        repo: t.repo,
        layer: t.layer,
        body: (JSON.parse(await runGh(["issue", "view", t.url, "--json", "body"])) as { body: string }).body ?? "",
      })),
  );
  return planWave(ready, max);
}

async function runPlan(args: string[]): Promise<number> {
  const at = args.indexOf("--max");
  const max = at < 0 ? DEFAULT_WAVE_MAX : Number(args[at + 1]);
  const epic = args.filter((a, i) => a !== "--json" && (at < 0 || (i !== at && i !== at + 1)));
  if (epic.length !== 1 || !Number.isInteger(max) || max < 1) throw new UsageError("");
  const e = parseIssue(epic[0]);
  const [owner, repo] = e.repoFlag.length ? e.repo.split("/") : ["{owner}", "{repo}"];
  const vars = e.repoFlag.length ? ["-f", `owner=${owner}`, "-f", `repo=${repo}`] : ["-F", `owner=${owner}`, "-F", `repo=${repo}`];
  const state = derive(parseSnapshot(JSON.parse(await runGh(["api", "graphql", "-f", `query=${SNAPSHOT_QUERY}`, ...vars, "-F", `number=${e.number}`]))));
  const plan = await wavePlan(state, max);
  process.stdout.write(
    args.includes("--json")
      ? JSON.stringify(plan, null, 2) + "\n"
      : `wave: ${plan.wave.join(", ") || "none"}\n` + plan.held.map((h) => `held: ${h.ticket} (${h.reason})\n`).join(""),
  );
  return 0;
}

/**
 * Plans the next Wave, or records a wave, a pull request or a panel round on the wave comment.
 *
 * @param args - `plan <epic>` with `--max N` and `--json` for the {@link WavePlan} shape; or the Epic (an issue
 *   number in the current repo or an issue URL), then `add`, `pr` or `panel` and that form's flags.
 * @returns 0 when the plan is printed or the comment written; 2 on a usage error (a `pr` for a ticket no wave holds
 *   included), with the usage on stderr; 1 when `gh` fails or the stored trailer does not decode, with the reason on
 *   stderr.
 * @example
 * ```bash
 * spp wave plan 197 --max 3 --json
 * spp wave 197 add --n 1 --tickets 200,201 --workers w1,w2 --started 2026-11-02T09:00:00Z --edges none
 * spp wave 197 panel --round 1 --verdict MERGE --report https://github.com/syn54x/skills-plus-plus/pull/9
 * ```
 */
export function run(args: string[]): Promise<number> {
  if (args[0] === "plan") return guarded(() => "wave plan", USAGE, () => runPlan(args.slice(1)));
  const [epic, op, ...rest] = args;
  const known = op !== undefined && Object.hasOwn(FLAGS, op);
  return guarded(() => (known ? `wave ${op}` : "wave"), USAGE, async () => {
    if (epic === undefined) throw new UsageError("");
    if (!known) throw new UsageError("wave takes add, pr or panel");
    const merge = merger(op, Object.fromEntries(flagPairs(rest, FLAGS[op])));
    print(
      await updateMarker(epic, "<!-- sdd-wave -->", render, (old) => {
        const data = { waves: [], panel: [], ...old } as WaveData;
        merge(data);
        return data;
      }),
    );
  });
}
