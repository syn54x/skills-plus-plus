// The deterministic half of the panel report: Persona findings in, one deduplicated list out. Pure: no network,
// filesystem or environment, so the same findings always give the same list and the same ids.

/** How much a finding matters. */
export type Severity = "critical" | "important" | "minor";
export const SEVERITIES = ["critical", "important", "minor"] as const satisfies readonly Severity[];

/** One finding as a Persona reports it. */
export type Finding = {
  /** The file it is about. */
  file: string;
  /** The line in that file. */
  line: number;
  /** A one-line title. */
  title: string;
  /** How much it matters. */
  severity: Severity;
  /** 0 to 100; under 80 the finding is dropped. */
  confidence: number;
  /** The Law tag it cites, if any. */
  law?: string;
  /** The finding's text. */
  body: string;
};
/** One Persona's findings file, the input of `spp findings merge`. */
export type PersonaFindings = {
  /** The Persona's name. */
  persona: string;
  /** Everything it found. */
  findings: Finding[];
};
/** A finding after the merge, standing for every Persona finding it absorbed. */
export type Merged = {
  /** `F1`, `F2` and so on, in the merged list's order: most severe first, then by file and line. */
  id: string;
  /** The file it is about. */
  file: string;
  /** The line in that file. */
  line: number;
  /** A one-line title. */
  title: string;
  /** The highest severity among the findings merged into it. */
  severity: Severity;
  /** Every Persona that reported it. */
  personas: string[];
  /** The Law tag it cites, if any. */
  law?: string;
  /** The finding's text. */
  body: string;
};
export type MergeResult = {
  findings: Merged[];
  counts: { severity: Record<string, number>; persona: Record<string, number> };
  dropped: number; // findings under MIN_CONFIDENCE, which never reach the list
  recheck: string[]; // ids of merged findings that absorbed a finding from a `rechecks` input
  lines: Record<string, number[]>; // for each merged id, the distinct lines its findings sat on, ascending
};

export const MIN_CONFIDENCE = 80;
// Findings of one normalised title on a file are one when their lines sit less than WINDOW from the first of them, and
// those title clusters are one group, whatever their titles, when their first lines sit less than WINDOW from the
// group's first: Personas rarely word one defect the same. A tagged title (see `tagOf`) merges only with its own tag.
export const WINDOW = 5;

const normal = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
// The title prefixes the panel's skills give meaning to (VERDICT.md): a `ticket-mandated:` finding is a person's call, so
// merging a real Critical into one would turn FIX FIRST into HUMAN DECISION. An untagged title has the tag "".
const tagOf = (title: string) => /^(ticket-mandated:|candidate adr:|check after deploy:|terminology)/i.exec(title)?.[1].toLowerCase() ?? "";
const cmp = (a: string | number, b: string | number) => (a < b ? -1 : a > b ? 1 : 0);
const rank = (s: Severity) => SEVERITIES.indexOf(s);

// Checks one persona file's JSON; throws an Error that names `where`.
export function parsePersonaFindings(json: unknown, where: string): PersonaFindings {
  const bad = (what: string): never => {
    throw new Error(`${where}: ${what}`);
  };
  const o = json as { persona?: unknown; findings?: unknown };
  if (typeof o?.persona !== "string" || !o.persona) bad("persona must be a non-empty string");
  if (!Array.isArray(o.findings)) bad("findings must be an array");
  const findings = (o.findings as Record<string, unknown>[]).map((f, i): Finding => {
    const at = (what: string) => bad(`findings[${i}].${what}`);
    const severity = typeof f?.severity === "string" ? f.severity.toLowerCase() : "";
    if (!SEVERITIES.includes(severity as Severity)) at(`severity must be one of ${SEVERITIES.join(", ")}`);
    if (typeof f.file !== "string" || !f.file) at("file must be a non-empty string");
    if (!Number.isInteger(f.line)) at("line must be an integer");
    if (typeof f.title !== "string" || !f.title) at("title must be a non-empty string");
    if (typeof f.confidence !== "number") at("confidence must be a number");
    if (typeof f.body !== "string") at("body must be a string");
    if (f.law !== undefined && typeof f.law !== "string") at("law must be a string");
    return { file: f.file as string, line: f.line as number, title: f.title as string, severity: severity as Severity, confidence: f.confidence as number, law: f.law as string | undefined, body: f.body as string };
  });
  return { persona: o.persona as string, findings };
}

/**
 * The panel's verdict: FIX FIRST when a reading failed, a Persona never reported or a critical finding that is not
 * ticket-mandated stands (HUMAN DECISION from round 3 on); else HUMAN DECISION when an important finding stands, the checks are pending or a
 * finding is ticket-mandated; else MERGE.
 */
export type PanelVerdict = "MERGE" | "FIX FIRST" | "HUMAN DECISION";
export type Reading = "pass" | "fail";
// What the panel read besides the findings: the review skill's Spec and Coherence verdicts, Verify on the head, the
// checks, and the Personas that never reported. `round` is 1 for the first panel and one more for each look after a fix.
export type Readings = { round: number; spec: Reading; coherence: Reading; verify: Reading; checks: Reading | "pending" | "none"; missing: string[] };

// Fix rounds allowed before a person decides: the verdict of round 3 or later is never FIX FIRST.
export const CAP_ROUND = 3;

// The first row that holds wins (skills/review-panel/VERDICT.md). A finding titled `ticket-mandated:` is what the
// ticket asked for, so it never sends a worker to undo it: it is a person's call at any severity.
export function panelVerdict(result: MergeResult, r: Readings): PanelVerdict {
  const mandated = result.findings.filter((f) => /^ticket-mandated:/i.test(f.title));
  const critical = result.findings.filter((f) => f.severity === "critical" && !mandated.includes(f));
  const broken = r.spec === "fail" || r.coherence === "fail" || r.verify === "fail" || r.checks === "fail" || r.missing.length > 0 || critical.length > 0;
  if (broken) return r.round >= CAP_ROUND ? "HUMAN DECISION" : "FIX FIRST";
  const open = result.findings.some((f) => f.severity === "important") || r.checks === "pending" || mandated.length > 0;
  return open ? "HUMAN DECISION" : "MERGE";
}

type Candidate = Finding & { persona: string; recheck: boolean };
const byPlace = (a: Candidate, b: Candidate) => cmp(a.line, b.line) || cmp(a.persona, b.persona) || cmp(a.confidence, b.confidence) || cmp(normal(a.title), normal(b.title));

// `rechecks` are the inputs that re-report an earlier finding; the merged findings they reach are listed in `recheck`.
export function mergeFindings(inputs: PersonaFindings[], rechecks: ReadonlySet<PersonaFindings> = new Set()): MergeResult {
  const all: Candidate[] = inputs.flatMap((p) => p.findings.map((f) => ({ ...f, persona: p.persona, recheck: rechecks.has(p) })));
  const kept = all.filter((f) => f.confidence >= MIN_CONFIDENCE);

  // Two passes per file, over sorted input so the clusters never depend on the file order. First, findings of one
  // normalised title cluster by line: one joins the open title cluster when it sits less than WINDOW lines from that
  // cluster's first line. Second, whole title clusters fold whatever their titles, within one tag: one joins the open
  // group when its first line sits less than WINDOW lines from the group's first line. A title cluster is never split,
  // so every merge of one title stays, which a single pass anchored at a neighbour's line could undo.
  const byTitle = new Map<string, Candidate[]>();
  for (const f of kept) {
    const key = `${f.file}\0${normal(f.title)}`;
    byTitle.set(key, [...(byTitle.get(key) ?? []), f]);
  }
  const titleClusters: Candidate[][] = [];
  for (const group of byTitle.values()) {
    group.sort(byPlace);
    let open: Candidate[] | undefined;
    for (const f of group) {
      if (open && f.line - open[0].line < WINDOW) open.push(f);
      else titleClusters.push((open = [f]));
    }
  }
  const byTag = new Map<string, Candidate[][]>();
  for (const t of titleClusters) {
    const key = `${t[0].file}\0${tagOf(t[0].title)}`; // titles that differ only in punctuation share a cluster; its first finding names the tag
    byTag.set(key, [...(byTag.get(key) ?? []), t]);
  }
  const clusters: Candidate[][] = [];
  for (const group of byTag.values()) {
    group.sort((a, b) => byPlace(a[0], b[0]));
    let open: Candidate[] | undefined;
    for (const t of group) {
      if (open && t[0].line - open[0].line < WINDOW) open.push(...t);
      else clusters.push((open = [...t]));
    }
  }
  for (const c of clusters) c.sort(byPlace);

  // The highest severity speaks (then the most confident, then the first persona by name); every persona is kept, and
  // each other title stays in the body so a fixer still sees a second defect that sits on a neighbouring line.
  const merged = clusters.map((c) => {
    const [top] = [...c].sort((a, b) => rank(a.severity) - rank(b.severity) || b.confidence - a.confidence || cmp(a.persona, b.persona) || cmp(a.line, b.line));
    // The speaker's Law tag when it cites one: `spp retro` counts findings by it, and an absorbed defect's tag would misfile this one.
    const law = top.law || [...c].sort((a, b) => cmp(a.persona, b.persona)).find((f) => f.law)?.law;
    const personas = [...new Set(c.map((f) => f.persona))].sort(cmp);
    const spoken = new Set([normal(top.title)]);
    const also: string[] = [];
    for (const f of c) { // c is in line, then persona, order: the first finding to use a title is the one named
      if (spoken.has(normal(f.title))) continue;
      spoken.add(normal(f.title));
      also.push(`Also reported as: ${f.title} (${f.persona}, line ${f.line})`);
    }
    const body = also.length ? `${top.body}\n\n${also.join("\n")}` : top.body;
    const lines = [...new Set(c.map((f) => f.line))].sort(cmp);
    return { file: top.file, line: top.line, title: top.title, severity: top.severity, personas, ...(law && { law }), body, recheck: c.some((f) => f.recheck), lines };
  });
  merged.sort((a, b) => rank(a.severity) - rank(b.severity) || cmp(a.file, b.file) || cmp(a.line, b.line) || cmp(normal(a.title), normal(b.title)) || cmp(a.personas.join(), b.personas.join()));

  const findings: Merged[] = merged.map(({ recheck: _, lines: __, ...m }, i) => ({ id: `F${i + 1}`, ...m }));
  const recheck = findings.filter((_, i) => merged[i].recheck).map((f) => f.id);
  const lines = Object.fromEntries(findings.map((f, i) => [f.id, merged[i].lines]));
  const severity = Object.fromEntries(SEVERITIES.map((s) => [s, findings.filter((f) => f.severity === s).length]));
  const persona = Object.fromEntries([...new Set(inputs.map((p) => p.persona))].sort(cmp).map((p) => [p, findings.filter((f) => f.personas.includes(p)).length]));
  return { findings, counts: { severity, persona }, dropped: all.length - kept.length, recheck, lines };
}

// A path git quoted (non-ASCII or special characters, core.quotePath): drop the quotes and decode \ooo bytes and \" \\ \t \n.
function unquote(path: string): string {
  if (!/^".*"$/.test(path)) return path;
  const bytes: number[] = [];
  const named: Record<string, number> = { t: 9, n: 10, '"': 34, "\\": 92 };
  const inner = Buffer.from(path.slice(1, -1));
  for (let i = 0; i < inner.length; i++) {
    const rest = inner.toString("latin1", i + 1, i + 4);
    if (inner[i] !== 92) bytes.push(inner[i]);
    else if (/^[0-7]{3}$/.test(rest)) (bytes.push(parseInt(rest, 8)), (i += 3));
    else bytes.push(named[String.fromCharCode(inner[++i])] ?? inner[i]);
  }
  return Buffer.from(bytes).toString("utf8");
}

/**
 * The new-side line numbers a unified diff added or changed, by file: the `+` lines of each section under its
 * `+++ b/<path>`. Context and `-` lines are not changed lines, and a section whose `+++` is `/dev/null` has none.
 */
export function changedLines(patch: string): Map<string, Set<number>> {
  const out = new Map<string, Set<number>>();
  let lines: Set<number> | undefined;
  let next = 0;
  let left = [0, 0]; // old and new lines still owed by the current hunk, so "+++ x" inside a hunk is a + line
  for (const l of patch.split("\n")) {
    if (left[0] > 0 || left[1] > 0) {
      if (l[0] === "+") { lines?.add(next++); left[1]--; }
      else if (l[0] === "-") left[0]--;
      else if (l[0] === "\\") continue; // "\ No newline at end of file"
      else if (l[0] === " " || l === "") { next++; left[0]--; left[1]--; }
      continue;
    }
    const h = /^@@ -\d+(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(l);
    if (h) { left = [Number(h[1] ?? 1), Number(h[3] ?? 1)]; next = Number(h[2]); continue; }
    if (l.startsWith("+++ ")) {
      const path = unquote(l.slice(4).split("\t")[0]);
      const file = path.replace(/^b\//, "");
      if (path === "/dev/null") lines = undefined;
      else out.set(file, (lines = out.get(file) ?? new Set()));
    }
  }
  return out;
}
