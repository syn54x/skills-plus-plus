// The deterministic half of the panel report: Persona findings in, one deduplicated list out. Pure: no network,
// filesystem or environment, so the same findings always give the same list and the same ids.

export const SEVERITIES = ["critical", "important", "minor"] as const;
export type Severity = (typeof SEVERITIES)[number];

export type Finding = { file: string; line: number; title: string; severity: Severity; confidence: number; law?: string; body: string };
export type PersonaFindings = { persona: string; findings: Finding[] };
export type Merged = { id: string; file: string; line: number; title: string; severity: Severity; personas: string[]; law?: string; body: string };
export type MergeResult = {
  findings: Merged[];
  counts: { severity: Record<string, number>; persona: Record<string, number> };
  dropped: number; // findings under MIN_CONFIDENCE, which never reach the list
};

export const MIN_CONFIDENCE = 80;
// Two findings are one when they share a file and a normalised title and their lines sit less than WINDOW apart.
export const WINDOW = 5;

const normal = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
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

type Candidate = Finding & { persona: string };

export function mergeFindings(inputs: PersonaFindings[]): MergeResult {
  const all: Candidate[] = inputs.flatMap((p) => p.findings.map((f) => ({ ...f, persona: p.persona })));
  const kept = all.filter((f) => f.confidence >= MIN_CONFIDENCE);

  // Cluster by file and normalised title, then by line: a finding joins the open cluster when it sits less than
  // WINDOW lines from the cluster's first line. Sorted input makes the clusters independent of the file order.
  const byKey = new Map<string, Candidate[]>();
  for (const f of kept) {
    const key = `${f.file}\0${normal(f.title)}`;
    byKey.set(key, [...(byKey.get(key) ?? []), f]);
  }
  const clusters: Candidate[][] = [];
  for (const group of byKey.values()) {
    group.sort((a, b) => cmp(a.line, b.line) || cmp(a.persona, b.persona) || cmp(a.confidence, b.confidence));
    let open: Candidate[] | undefined;
    for (const f of group) {
      if (open && f.line - open[0].line < WINDOW) open.push(f);
      else clusters.push((open = [f]));
    }
  }

  // The highest severity speaks (then the most confident, then the first persona by name); every persona is kept.
  const merged = clusters.map((c) => {
    const [top] = [...c].sort((a, b) => rank(a.severity) - rank(b.severity) || b.confidence - a.confidence || cmp(a.persona, b.persona) || cmp(a.line, b.line));
    const law = [...c].sort((a, b) => cmp(a.persona, b.persona)).find((f) => f.law)?.law;
    const personas = [...new Set(c.map((f) => f.persona))].sort(cmp);
    return { file: top.file, line: top.line, title: top.title, severity: top.severity, personas, ...(law && { law }), body: top.body };
  });
  merged.sort((a, b) => rank(a.severity) - rank(b.severity) || cmp(a.file, b.file) || cmp(a.line, b.line) || cmp(normal(a.title), normal(b.title)) || cmp(a.personas.join(), b.personas.join()));

  const findings: Merged[] = merged.map((m, i) => ({ id: `F${i + 1}`, ...m }));
  const severity = Object.fromEntries(SEVERITIES.map((s) => [s, findings.filter((f) => f.severity === s).length]));
  const persona = Object.fromEntries([...new Set(inputs.map((p) => p.persona))].sort(cmp).map((p) => [p, findings.filter((f) => f.personas.includes(p)).length]));
  return { findings, counts: { severity, persona }, dropped: all.length - kept.length };
}
