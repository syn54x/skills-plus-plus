/**
 * `spp wave` plans the next Wave, and records waves, their pull requests and the review panel's rounds on the
 * Epic's one `<!-- sdd-wave -->` comment.
 *
 * Its forms:
 *
 * - `spp wave plan <epic> [--max N] [--started T,...] [--json]` runs the parallel safety check over the ready
 *   Sub-issues: Files owned that overlap in one repo, and Consumes and Produces pairs across repos. Work in flight
 *   (claimed, assigned or with its pull request open, until it merges, and a ready ticket `--started` names) takes
 *   part too, so a ready ticket that overlaps it stays held. It prints
 *   the tickets that can run together (at most `--max`, default 4) and the held ones with why; with `--json` it
 *   prints {@link WavePlan}. It writes nothing.
 * - `spp wave <epic> add --n N --tickets ... --workers ... --started ISO8601 --edges ...` records a Wave, replacing
 *   any wave with the same `--n`.
 * - `spp wave <epic> pr --ticket T --pr URL|#n` records a pull request on the last wave holding `--ticket`, in any
 *   of its forms: a number in the Epic's repo, `owner/repo#N` or the issue URL.
 * - `spp wave <epic> panel [--pr URL] --round R --verdict V [--report URL] ...` records a review panel round,
 *   replacing the entry with the same `--pr` and `--round`. `--pr` is the main-gate pull request the round reviewed,
 *   as its URL (`https://github.com/<owner>/<repo>/pull/<n>`, since a bare number is ambiguous across a Multi-repo
 *   epic's repos; anything else is a usage error), so each repo's pull request keeps its own round 1. A call with no
 *   `--pr` keys the round among the entries with no `pr`, as the trailers written before `--pr` hold them. The comment
 *   lists the entries with no `pr` first, then each pull request's rounds in round order, pull requests in URL order.
 *
 * Waves and panel rounds are lists inside the comment's data trailer, so a retried call replaces its own entry and
 * never duplicates one. The writing forms print the comment's URL, and take `--by "<skill> <step>"`: the trailer's
 * `by` records the write's maker, build or the skill and step `--by` names.
 *
 * @module
 */
import { derive, type EpicState, type Ticket } from "../derive.ts";
import { fetchSnapshot } from "../fetch-snapshot.ts";
import { runGh } from "../gh.ts";
import { type Data, flagPairs, guarded, parseBy, parseIssue, print, updateMarker, UsageError } from "../markers.ts";
import { DEFAULT_WAVE_MAX, inFlight } from "../plan-next.ts";
import { parseTicket } from "../ticket.ts";

/** The usage text `spp wave --help` prints. */
export const USAGE = `usage: spp wave plan <epic> [--max N] [--started 101,owner/repo#7] [--json]
       spp wave <epic> add  --n N --tickets 101,owner/repo#7 --workers w1,w2 --started ISO8601
                             --edges "104<103,owner/repo#7<101" | --edges none
       spp wave <epic> pr    --ticket 101|owner/repo#7 --pr URL|#n
       spp wave <epic> panel [--pr https://github.com/owner/repo/pull/N] --round R
                             --verdict "FIX FIRST"|"HUMAN DECISION"|MERGE [--report URL]
                             [--severity critical=1,important=2,minor=3] [--persona name=count,...] [--dropped D]
wave plan prints the ready tickets that can run together (at most --max, default ${DEFAULT_WAVE_MAX}) and the held ones with why;
a ready ticket that overlaps work in flight (claimed, assigned or with its PR open) is held until that merges;
--started names ready tickets whose workers were started and have not claimed yet, which count as in flight.
wave add replaces every wave with the same --n; wave panel replaces the entry with the same --pr and --round, so each
pull request of a Multi-repo epic keeps its own rounds (--pr takes the pull request URL, never a bare number, and
without it a round is keyed among the rounds with no PR; a round shown but never posted has no --report and renders unposted);
wave pr records the PR on the last wave whose tickets hold --ticket, in any of its forms (number, owner/repo#N, URL).
A wave ticket is a number, owner/repo#N or an issue URL, stored and rendered as given.
add, pr and panel take --by "<skill> <step>", which records the write as that skill's (default build), the rest as its step.
`;

type Wave = { n: number; tickets: (string | number)[]; workers: string[]; started: string; edges: (string | number)[][]; prs: Record<string, string> };
type Round = { round: number; verdict: string; report: string | null; severity: Record<string, number>; persona: Record<string, number>; dropped: number; pr?: string };
type WaveData = { waves: Wave[]; panel: Round[] };

const T = String.raw`(?:\d+|[\w.-]+/[\w.-]+#\d+|https://github\.com/[\w.-]+/[\w.-]+/issues/\d+)`;
const TICKETS = new RegExp(`^${T}(,${T})*$`);
const EDGES = new RegExp(`^(none|${T}<${T}(,${T}<${T})*)$`);
const COUNTS = /^([\w-]+=\d+(,[\w-]+=\d+)*)?$/;
const PULL_URL = /^https:\/\/github\.com\/([\w.-]+\/[\w.-]+)\/pull\/(\d+)$/;
const FLAGS: Record<string, string[]> = {
  add: ["--n", "--tickets", "--workers", "--started", "--edges"],
  pr: ["--ticket", "--pr"],
  panel: ["--pr", "--round", "--verdict", "--report", "--severity", "--persona", "--dropped"],
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
    ...d.panel.map((p) => `Panel round ${p.round}${p.pr ? ` on ${p.pr.replace(PULL_URL, "$1#$2")}` : ""}: ${p.verdict} (${p.report ?? "unposted"})`),
  ].join("\n");
}

// Whether two forms of a ticket (a number, owner/repo#N or the issue URL) name the same one, a number taken to be in
// the Epic's repo. shortcut: with the Epic given as a number its repo is unknown, so a number then matches only a number.
function sameTicket(epicRepo: string | null): (a: string | number, b: string) => boolean {
  const key = (t: string) => {
    const m = /^(?:https:\/\/github\.com\/)?([\w.-]+\/[\w.-]+)(?:#|\/issues\/)(\d+)$/.exec(t);
    return m ? `${m[1].toLowerCase()}#${m[2]}` : `${epicRepo?.toLowerCase() ?? ""}#${t}`;
  };
  return (a, b) => key(String(a)) === key(b);
}

// The merge for each operation, from its flags.
function merger(op: string, f: Record<string, string>, epicRepo: string | null): (d: WaveData) => void {
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
    const same = sameTicket(epicRepo);
    // The PR is stored under the ticket as the wave holds it, whichever form --ticket used.
    return (d) => {
      const w = d.waves.findLast((w) => w.tickets.some((t) => same(t, ticket)));
      if (!w) throw new UsageError(`no wave holds ticket ${ticket}`);
      w.prs[String(w.tickets.find((t) => same(t, ticket)))] = f["--pr"];
    };
  }
  const round = f["--round"] ?? "";
  const dropped = f["--dropped"] ?? "0";
  if (f["--pr"] !== undefined && !PULL_URL.test(f["--pr"])) throw new UsageError("wave panel --pr takes a pull request URL, https://github.com/owner/repo/pull/N");
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
    ...(f["--pr"] && { pr: f["--pr"] }),
  };
  // A retried round replaces the entry with the same pull request and round (an entry with no pr is its own group),
  // so each repo of a Multi-repo epic keeps its own round 1. Entries with no pr come first, then pull requests in URL order.
  return (d) => {
    const url = (p: Round) => p.pr ?? "";
    d.panel = [...d.panel.filter((p) => p.pr !== entry.pr || p.round !== entry.round), entry].sort(
      (a, b) => Number(!!a.pr) - Number(!!b.pr) || Number(url(a) > url(b)) - Number(url(a) < url(b)) || a.round - b.round,
    );
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

const parse = (t: PlanInput): Parsed => {
  const ticket = parseTicket(t.body);
  return { ...t, paths: ticket.filesOwned.flatMap((f) => f.paths), consumes: names(ticket.consumes), produces: names(ticket.produces), refs: references(ticket.consumes, t.repo) };
};

// Why `b` cannot run beside `a`, or undefined: a shared path in one repo, `b` consuming what `a` produces, or, unless
// `a` already runs, the reverse.
function conflict(b: Parsed, a: Parsed, running = false): string | undefined {
  const shared = a.repo === b.repo ? b.paths.find((p) => a.paths.some((q) => overlaps(p, q))) : undefined;
  if (shared) return `shares ${shared} with ${a.id}`;
  if (consumes(b, a)) return `consumes ${a.id}`;
  if (!running && consumes(a, b)) return `consumed by ${a.id}`;
}

// Considers the tickets by layer, then number: each joins the wave unless it conflicts with work in flight or with a
// member already in it, so the lower layer and the lower number are the ones kept. Paths are compared per repo; Create
// counts as well as Modify and Test, since a ticket that modifies what another creates must wait for it.
function planWave(tickets: PlanInput[], max: number, running: PlanInput[]): WavePlan {
  const parsed = tickets.map(parse);
  const flight = running.map(parse);
  parsed.sort((a, b) => (a.layer ?? Infinity) - (b.layer ?? Infinity) || a.number - b.number || a.repo.localeCompare(b.repo));
  const wave: Parsed[] = [];
  const held: WavePlan["held"] = [];
  for (const b of parsed) {
    const hold = (reason: string) => held.push({ ticket: b.id, reason });
    if (!b.paths.length) {
      hold("no Files owned");
      continue;
    }
    const reason = flight.map((a) => conflict(b, a, true)).find(Boolean) ?? wave.map((a) => conflict(b, a)).find(Boolean);
    if (reason) hold(reason);
    else if (wave.length >= max) hold("wave full");
    else wave.push(b);
  }
  return { wave: wave.map((t) => t.id), held };
}

/**
 * The URLs of the ready tickets a `--started` list names, each a number in the Epic's repo, `owner/repo#N` or the
 * issue URL. A named ticket that has claimed, opened a pull request or been handed back is left out: its own state
 * holds it, or nothing does. A name that matches no ticket is ignored.
 *
 * @internal
 */
export function startedOf(state: EpicState, list: string): Set<string> {
  if (!TICKETS.test(list)) throw new UsageError("--started takes 101,owner/repo#7,... or issue URLs");
  const same = sameTicket(state.epic.repo);
  return new Set(state.tickets.filter((t) => t.state === "ready" && list.split(",").some((s) => same(s, t.url))).map((t) => t.url));
}

/**
 * The wave over the state's ready tickets, held against every in-flight ticket (see `inFlight` in plan-next.ts) and
 * every ticket in `started`, reading each one's body for its Files owned and Interfaces.
 *
 * @internal
 */
export async function wavePlan(state: EpicState, max: number, started: Set<string> = new Set()): Promise<WavePlan> {
  const input = async (t: Ticket): Promise<PlanInput> => ({
    id: t.repo === state.epic.repo ? String(t.number) : `${t.repo}#${t.number}`,
    number: t.number,
    repo: t.repo,
    layer: t.layer,
    body: (JSON.parse(await runGh(["issue", "view", t.url, "--json", "body"])) as { body: string }).body ?? "",
  });
  const [ready, running] = await Promise.all([
    Promise.all(state.tickets.filter((t) => t.state === "ready" && !started.has(t.url)).map(input)),
    Promise.all(state.tickets.filter((t) => inFlight(t) || started.has(t.url)).map(input)),
  ]);
  return planWave(ready, max, running);
}

async function runPlan(args: string[]): Promise<number> {
  const at = args.indexOf("--max");
  const st = args.indexOf("--started");
  const max = at < 0 ? DEFAULT_WAVE_MAX : Number(args[at + 1]);
  const flags = new Set([at, st].filter((i) => i >= 0).flatMap((i) => [i, i + 1]));
  const epic = args.filter((a, i) => a !== "--json" && !flags.has(i));
  if (epic.length !== 1 || !Number.isInteger(max) || max < 1) throw new UsageError("");
  const state = derive((await fetchSnapshot(parseIssue(epic[0]).arg))!);
  const plan = await wavePlan(state, max, st < 0 ? undefined : startedOf(state, args[st + 1] ?? ""));
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
 * spp wave 197 panel --pr https://github.com/syn54x/skills-plus-plus/pull/9 --round 1 --verdict MERGE
 * ```
 */
export function run(args: string[]): Promise<number> {
  if (args[0] === "plan") return guarded(() => "wave plan", USAGE, () => runPlan(args.slice(1)));
  const [epic, op, ...rest] = args;
  const known = op !== undefined && Object.hasOwn(FLAGS, op);
  return guarded(() => (known ? `wave ${op}` : "wave"), USAGE, async () => {
    if (epic === undefined) throw new UsageError("");
    if (!known) throw new UsageError("wave takes add, pr or panel");
    const e = parseIssue(epic);
    const f = Object.fromEntries(flagPairs(rest, [...FLAGS[op], "--by"]));
    const by = f["--by"] === undefined ? undefined : parseBy(f["--by"]);
    const merge = merger(op, f, e.repoFlag.length ? e.repo : null);
    const { url } = await updateMarker(epic, "<!-- sdd-wave -->", render, (old) => {
      const data = { waves: [], panel: [], ...old } as WaveData;
      merge(data);
      return data;
    }, by);
    print(url);
  });
}
