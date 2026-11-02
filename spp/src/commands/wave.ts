// spp wave <epic> add|pr|panel ...: owns the Epic's one wave comment. Waves and panel rounds are lists inside
// its data, so a retried call replaces its own entry and never duplicates one.
import { type Data, flagPairs, guarded, print, updateMarker, UsageError } from "../markers.ts";

const USAGE = `usage: spp wave <epic> add   --n N --tickets 101,owner/repo#7 --workers w1,w2 --started ISO8601
                             --edges "104<103,owner/repo#7<101" | --edges none
       spp wave <epic> pr    --ticket 101|owner/repo#7 --pr URL|#n
       spp wave <epic> panel --round R --verdict "FIX FIRST"|"HUMAN DECISION"|MERGE [--report URL]
                             [--severity critical=1,important=2,minor=3] [--persona name=count,...] [--dropped D]
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

export function run(args: string[]): Promise<number> {
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
