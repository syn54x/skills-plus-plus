// spp retro <epic> [--json]: the Epic's retro numbers, collected from GitHub alone.
//
// Where each number comes from:
//   byCause, byTicket, rounds  the gate's verdicts on the Sub-issues' pull requests (reviews and comments). A body
//                              with a `## Spec: FAIL` or `## Quality: FAIL` heading is one fix round, and each of
//                              its finding lines (`- <severity> · [<source>#<id>] · <file:line at sha> · ...`) counts
//                              once under its whole Law tag, `none` when it carries no tag.
//   handBacks                  `labeled` events for needs-info, ready-for-human and blocked on the Sub-issues.
//   panel                      the rounds the wave comment's data trailer records (`spp wave <epic> panel`).
//   ponytail                   a pull request comment that starts `## Ponytail` and lists the findings ponytail
//                              raised that stood after verification, one `- <severity> · <file:line> · <title>` per
//                              line. A hit is such a line; it overlaps the gate when a verdict finding on the same
//                              pull request names the same file within WINDOW lines, and is unique otherwise.
// A pull request is a Sub-issue's when GitHub links it or the wave trailer records it. An input that cannot be read
// is "not found", named on stderr, and never counted as 0.
import { WINDOW } from "../findings.ts";
import { GhError, runGh } from "../gh.ts";
import { guarded, parseIssue, readTrailer, UsageError } from "../markers.ts";
import { parseSnapshot, SNAPSHOT_QUERY, type Snapshot } from "../snapshot.ts";

const USAGE = `usage: spp retro <epic number | issue URL> [--json]
Prints the Epic's retro numbers from GitHub: findings by Law tag and by ticket, fix rounds, hand-backs,
the panel's rounds and findings, and ponytail's hits, unique hits and overlap. A number whose input is missing
reads "not found" (and, for the others, is named on stderr), never 0.
`;

type Retro = {
  byCause: Record<string, number>;
  byTicket: Record<string, number>;
  rounds: number;
  handBacks: number;
  panel: { rounds: number; findings: number } | "not found";
  ponytail: { hits: number; unique: number; overlap: number } | "not found";
};

const HAND_BACK_LABELS = ["needs-info", "ready-for-human", "blocked"];
const FINDING = /^- (?:Critical|Important|Minor)\b(?: · \[([^\]]+)\])?(?: · ([^\s:·]+):(\d+)\b)?/;
type Found = { tag: string; file: string | null; line: number | null };

const findingsIn = (body: string): Found[] =>
  body.replace(/\r/g, "").split("\n").flatMap((l) => {
    const m = FINDING.exec(l);
    return m ? [{ tag: m[1]?.trim() ?? "none", file: m[2] ?? null, line: m[3] ? Number(m[3]) : null }] : [];
  });

type PrData = { rounds: number; causes: string[]; gate: Found[]; ponytail: Found[] | null };

function analyse(bodies: string[]): PrData {
  const verdicts = bodies.filter((b) => /^## (Spec|Quality): (PASS|FAIL)/m.test(b));
  const fails = verdicts.filter((b) => /^## (Spec|Quality): FAIL/m.test(b));
  const ponytail = bodies.filter((b) => b.trimStart().startsWith("## Ponytail"));
  return {
    rounds: fails.length,
    causes: fails.flatMap(findingsIn).map((f) => f.tag),
    gate: verdicts.flatMap(findingsIn),
    ponytail: ponytail.length ? ponytail.flatMap(findingsIn) : null,
  };
}

const count = (keys: string[]) => {
  const n: Record<string, number> = {};
  for (const k of keys) n[k] = (n[k] ?? 0) + 1;
  return Object.fromEntries(Object.entries(n).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)));
};

// The query variables for an Epic given as a number (the current repo, through gh's placeholders) or an issue URL.
// shortcut: status.ts keeps the same two helpers private; share them when a third command needs them.
function variables(epic: ReturnType<typeof parseIssue>): string[] {
  if (!epic.repoFlag.length) return ["-F", "owner={owner}", "-F", "repo={repo}", "-F", `number=${epic.number}`];
  const [owner, repo] = epic.repo.split("/");
  return ["-f", `owner=${owner}`, "-f", `repo=${repo}`, "-F", `number=${epic.number}`];
}

async function snapshot(epic: ReturnType<typeof parseIssue>): Promise<Snapshot> {
  let out: string;
  try {
    out = await runGh(["api", "graphql", "-f", `query=${SNAPSHOT_QUERY}`, ...variables(epic)]);
  } catch (e) {
    // gh exits 1 on a missing issue but still prints the response, which parseSnapshot reports as "epic not found".
    let missing = false;
    try {
      missing = e instanceof GhError && JSON.parse(e.stdout)?.data?.repository?.issue === null;
    } catch {}
    if (!missing) throw e;
    out = (e as GhError).stdout;
  }
  return parseSnapshot(JSON.parse(out));
}

type Wave = { panel?: { round: number; severity?: Record<string, number> }[]; waves?: { prs?: Record<string, string> }[] };

async function collect(arg: string, notFound: string[]): Promise<{ epic: Snapshot["epic"]; retro: Retro }> {
  const epic = parseIssue(arg);
  const snap = await snapshot(epic);
  const ref = (repo: string, n: number) => (repo === snap.epic.repo ? `#${n}` : `${repo}#${n}`);
  if (!snap.issues.length) notFound.push("sub-issues");

  // The wave comment's trailer: recorded pull requests and the panel's rounds.
  const bodies = (await runGh(["api", `repos/${epic.repo}/issues/${epic.number}/comments`, "--paginate", "--jq", ".[] | .body | @json"]))
    .split("\n").filter(Boolean).map((l) => JSON.parse(l) as string);
  const waveBody = bodies.find((b) => b.startsWith("<!-- sdd-wave -->"));
  let wave: Wave = {};
  if (waveBody) {
    const data = readTrailer(waveBody);
    if (data === null) notFound.push("wave trailer is unreadable");
    else wave = data as Wave;
  }

  // Each Sub-issue's pull requests: GitHub's links first, then the ones the wave trailer records.
  const prsOf = new Map<string, Set<string>>(snap.issues.map((i) => [i.url, new Set(i.prs.map((p) => p.url))]));
  for (const w of wave.waves ?? []) {
    for (const [key, value] of Object.entries(w.prs ?? {})) {
      const t = snap.issues.find((i) => [...(i.repo === snap.epic.repo ? [String(i.number)] : []), `${i.repo}#${i.number}`, i.url].includes(key));
      const url = /^#?(\d+)$/.exec(value) ? `https://github.com/${snap.epic.repo}/pull/${value.replace("#", "")}` : value;
      if (t) prsOf.get(t.url)!.add(url);
    }
  }
  const data = new Map<string, PrData>();
  for (const url of new Set([...prsOf.values()].flatMap((s) => [...s]))) {
    try {
      const view = JSON.parse(await runGh(["pr", "view", url, "--json", "reviews,comments"])) as { reviews?: { body?: string }[]; comments?: { body?: string }[] };
      data.set(url, analyse([...(view.reviews ?? []), ...(view.comments ?? [])].map((x) => x.body ?? "")));
    } catch {
      notFound.push(`reviews on ${url}`);
    }
  }

  const byTicket: Record<string, number> = {};
  let handBacks = 0;
  for (const i of snap.issues) {
    const mine = [...prsOf.get(i.url)!].filter((u) => data.has(u));
    if (mine.length) byTicket[ref(i.repo, i.number)] = mine.reduce((n, u) => n + data.get(u)!.causes.length, 0);
    else if (!prsOf.get(i.url)!.size) notFound.push(`pull request for ${ref(i.repo, i.number)}`);
    try {
      const labels = await runGh(["api", `repos/${i.repo}/issues/${i.number}/events`, "--paginate", "--jq", '.[] | select(.event == "labeled") | .label.name']);
      handBacks += labels.split("\n").filter((l) => HAND_BACK_LABELS.includes(l)).length;
    } catch {
      notFound.push(`events on ${ref(i.repo, i.number)}`);
    }
  }

  const rounds = new Map((wave.panel ?? []).map((p) => [p.round, p])); // the latest entry per round
  const prs = [...data.values()];
  const withPonytail = prs.filter((p) => p.ponytail);
  const hits = withPonytail.flatMap((p) => p.ponytail!.map((h) => ({ h, gate: p.gate })));
  const overlap = hits.filter(({ h, gate }) => h.file && gate.some((g) => g.file === h.file && g.line !== null && Math.abs(g.line - h.line!) < WINDOW)).length;
  return {
    epic: snap.epic,
    retro: {
      byCause: count(prs.flatMap((p) => p.causes)),
      byTicket,
      rounds: prs.reduce((n, p) => n + p.rounds, 0),
      handBacks,
      panel: rounds.size ? { rounds: rounds.size, findings: [...rounds.values()].reduce((n, r) => n + Object.values(r.severity ?? {}).reduce((a, b) => a + b, 0), 0) } : "not found",
      ponytail: withPonytail.length ? { hits: hits.length, unique: hits.length - overlap, overlap } : "not found",
    },
  };
}

function render(epic: Snapshot["epic"], r: Retro): string {
  const list = (o: Record<string, number>) => Object.entries(o).map(([k, n]) => `${k} ${n}`).join(", ") || "-";
  return (
    [
      `${epic.repo}#${epic.number} ${epic.title}`,
      `By cause: ${list(r.byCause)}`,
      `By ticket: ${list(r.byTicket)}`,
      `Fix rounds: ${r.rounds}`,
      `Hand-backs: ${r.handBacks}`,
      `Panel: ${r.panel === "not found" ? r.panel : `${r.panel.rounds} rounds, ${r.panel.findings} findings`}`,
      `Ponytail: ${r.ponytail === "not found" ? r.ponytail : `${r.ponytail.hits} hits, ${r.ponytail.unique} unique, ${r.ponytail.overlap} overlap`}`,
    ].join("\n") + "\n"
  );
}

export function run(args: string[]): Promise<number> {
  return guarded(() => "retro", USAGE, async () => {
    const rest = args.filter((a) => a !== "--json");
    if (rest.length !== 1) throw new UsageError("");
    const notFound: string[] = [];
    const { epic, retro } = await collect(rest[0], notFound);
    for (const what of notFound) process.stderr.write(`spp retro: not found: ${what}\n`);
    process.stdout.write(args.includes("--json") ? JSON.stringify(retro, null, 2) + "\n" : render(epic, retro));
  });
}
