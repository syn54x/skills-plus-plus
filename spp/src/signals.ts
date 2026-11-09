// The Signal log: one JSONL file per repository beside the notes log, each line one Signal (a correction charged to the
// skill step and plugin version that made the corrected artifact). `recordSignal` is the only writer: it checks the
// gates once, then builds its input, so a caller passes a builder and never checks the gates itself. It writes to the
// log of the checkout it runs in, never another repo's, and drops a Signal the log already holds.
// `pendingCandidates` reads the log grouped by fingerprint. The runs log beside it counts each skill step's runs, the
// denominator every report needs.
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname } from "node:path";
import { isAttended } from "./attended.ts";
import { notesFile } from "./notes-log.ts";
import { currentRepo } from "./notes.ts";
import { lowerMode, readSelfImprovementMode, SELF_IMPROVEMENT_MODES, type SelfImprovementMode, selfImprovementModeOf } from "./routing.ts";

/** The categories a Signal may carry: the 15 of `skills/close-epic/FEEDBACK.md`, then the four the Signal sources add. */
export const SIGNAL_CATEGORIES = [
  "verify-unrunnable", "contract-gap", "missed-edge", "undeclared-deviation", "brief-gap", "fix-round", "law-told",
  "law-not-told", "human-needed", "panel-noise", "panel-gap", "hook-wrong", "driver-failed", "step-unclear", "other",
  "fix-regression", "contract-edited", "wish", "escaped-defect",
] as const satisfies readonly string[];

/** What a Signal says was corrected: one of the categories `spp signal --help` lists. */
export type SignalCategory = (typeof SIGNAL_CATEGORIES)[number];

/**
 * A line of the Signal log. Only a Signal about another repo's issue carries `about`, that repo's `owner/repo`, and
 * `mode`, the lower of that repo's mode and the checkout's.
 */
export type Signal = { at: string; repo: string; category: SignalCategory; skill: string; step: string; version: string; evidence: string; fingerprint: string; about?: string; mode?: SelfImprovementMode };

/** The Signals of one skill step and category, grouped: an entry of the `spp feedback pending --json` list. */
export type FeedbackCandidate = {
  /** The first 12 hex characters of the SHA-256 of `<skill>\n<step>\n<category>`. */
  fingerprint: string;
  /** The skill the Signals are charged to. */
  skill: string;
  /** The step within the skill, or `""` when none was named. */
  step: string;
  /** What was corrected. */
  category: SignalCategory;
  /** How many Signals the log holds for this fingerprint. */
  count: number;
  /** The same count by the plugin version each Signal was charged to. */
  versions: Record<string, number>;
  /** Each Signal's evidence, oldest first. */
  evidence: string[];
  /** The lowest mode the group's Signals carry, present only when one about another repo's issue carries one. */
  mode?: SelfImprovementMode;
  /** The other repos the group's Signals are about, present only when there are any: filing treats them as an Epic's repos. */
  about?: string[];
};

/** One artifact a skill step made or took over: a line of the runs log. */
export type Run = { at: string; repo: string; skill: string; step: string; version: string; artifact: string };

// Why the gate says no: the reasons `notCollecting` gives.
type GateReason = "CI" | "Self-improvement mode is Off" | "not an attended session";

type Skipped = { skipped: GateReason | "already in the Signal log" | "already in the runs log" | "nothing to record" };

// owner__repo.signals.jsonl in the notes log's directory.
export const signalsFile = (env: { XDG_STATE_HOME?: string; HOME: string }, repo: string): string => notesFile(env, repo).replace(/\.jsonl$/, ".signals.jsonl");

// owner__repo.runs.jsonl beside the Signal log.
export const runsFile = (env: { XDG_STATE_HOME?: string; HOME: string }, repo: string): string => signalsFile(env, repo).replace(/\.signals\.jsonl$/, ".runs.jsonl");

export const fingerprint = (skill: string, step: string, category: SignalCategory): string =>
  createHash("sha256").update(`${skill}\n${step}\n${category}`).digest("hex").slice(0, 12);

// The sources run from spp/src and the npm package from dist/, one level nearer package.json.
const PACKAGE = new URL(import.meta.url.endsWith(".ts") ? "../../package.json" : "../package.json", import.meta.url);

/** The running plugin's version, from `package.json`. */
export const pluginVersion = (): string => (JSON.parse(readFileSync(PACKAGE, "utf8")) as { version: string }).version;

const stateEnv = (env: NodeJS.ProcessEnv) => ({ XDG_STATE_HOME: env.XDG_STATE_HOME, HOME: env.HOME || homedir() });

// The gate, evaluated once: why nothing would be recorded, in the order CI, Self-improvement mode, Attended session,
// or else the checkout's repo (null with no GitHub origin, where the Attended check falls back to the harness
// signal) and mode. The mode is read first, so an Off repo spawns no process.
function gate(env: NodeJS.ProcessEnv, dir: string): { skipped: GateReason } | { repo: string | null; mode: SelfImprovementMode } {
  if (env.CI) return { skipped: "CI" };
  const mode = readSelfImprovementMode(dir);
  if (mode === "Off") return { skipped: "Self-improvement mode is Off" };
  let repo: string | null = null;
  try {
    repo = currentRepo(dir);
  } catch {}
  return (repo ? isAttended(env, { repo, dir }) : isAttended(env)) ? { repo, mode } : { skipped: "not an attended session" };
}

/**
 * Why `recordSignal` and `recordRun` would record nothing, checked in this order: `CI` is set, the Routing block in
 * `dir` sets the Self-improvement mode to Off, or the session is not Attended. Null when they would record. The
 * writers check it themselves; a caller reads it to say why.
 */
export function notCollecting(env: NodeJS.ProcessEnv = process.env, dir: string = process.cwd()): GateReason | null {
  const g = gate(env, dir);
  return "skipped" in g ? g.skipped : null;
}

// What a writer takes: its input, or a builder called only once the gate says yes with the checkout's repo (so it
// never asks git again), which may make gh calls and may return null when there is nothing to record. `about` is the
// repo of the issue or pull request the record is about.
type Lazy<T> = T | ((own: string) => T | null | Promise<T | null>);

// Runs the gate, then builds the input; the checkout's repo is the log's. A record about another repo takes the
// lower of the two modes: skipped when that is Off, else returned as `mode`, which a Signal keeps for filing with
// `about`, the other repo's name.
async function open<T extends { about?: string }>(input: Lazy<T>, env: NodeJS.ProcessEnv, dir: string): Promise<Skipped | { repo: string; value: T; about?: string; mode?: SelfImprovementMode }> {
  const g = gate(env, dir);
  if ("skipped" in g) return g;
  const repo = g.repo ?? currentRepo(dir); // throws the origin message
  const value = typeof input === "function" ? await input(repo) : input;
  if (!value) return { skipped: "nothing to record" };
  if (!value.about || value.about.toLowerCase() === repo.toLowerCase()) return { repo, value };
  const mode = lowerMode(g.mode, await selfImprovementModeOf(value.about, dir, repo));
  return mode === "Off" ? { skipped: "Self-improvement mode is Off" } : { repo, value, about: value.about, mode };
}

const failed = (e: unknown) => ({ failed: e instanceof Error ? e.message : String(e) });

function append(file: string, line: unknown): void {
  mkdirSync(dirname(file), { recursive: true });
  appendFileSync(file, JSON.stringify(line) + "\n");
}

/**
 * Appends one Signal to the Signal log of the checkout in `dir`, or says why not. `input` may be a builder, called
 * only once the gate says yes. A Signal about another repo's issue (`about`) is recorded only when that repo's mode
 * is not Off, and one whose fingerprint and evidence the log already holds, whatever was decided on it, is not
 * recorded again. It never throws: an error building the input, resolving the repo, reading `package.json` or
 * writing the log comes back as `failed`.
 */
export async function recordSignal(
  input: Lazy<{ about?: string; category: SignalCategory; skill: string; step?: string; evidence: string; version?: string }>,
  env: NodeJS.ProcessEnv = process.env,
  dir: string = process.cwd(),
): Promise<{ signal: Signal } | Skipped | { failed: string }> {
  try {
    const o = await open(input, env, dir);
    if ("skipped" in o) return o;
    const { repo, value: v, about, mode } = o;
    const step = v.step ?? "";
    const fp = fingerprint(v.skill, step, v.category);
    const file = signalsFile(stateEnv(env), repo);
    if (logLines<Signal>(file).some((s) => s.fingerprint === fp && s.evidence === v.evidence)) return { skipped: "already in the Signal log" };
    const signal: Signal = { at: new Date().toISOString(), repo, category: v.category, skill: v.skill, step, version: v.version ?? pluginVersion(), evidence: v.evidence, fingerprint: fp, ...(about && { about }), ...(mode && { mode }) };
    append(file, signal);
    return { signal };
  } catch (e) {
    return failed(e);
  }
}

/**
 * Appends one run of a skill step to the checkout's runs log behind the same gate as `recordSignal`, unless the log
 * already holds a run with the same skill, step and artifact; it never throws.
 */
export async function recordRun(
  input: Lazy<{ about?: string; skill: string; step?: string; artifact: string }>,
  env: NodeJS.ProcessEnv = process.env,
  dir: string = process.cwd(),
): Promise<{ run: Run } | Skipped | { failed: string }> {
  try {
    const o = await open(input, env, dir);
    if ("skipped" in o) return o;
    const { repo, value: v } = o;
    const step = v.step ?? "";
    const file = runsFile(stateEnv(env), repo);
    if (logLines<Run>(file).some((r) => r.skill === v.skill && r.step === step && r.artifact === v.artifact)) return { skipped: "already in the runs log" };
    const run: Run = { at: new Date().toISOString(), repo, skill: v.skill, step, version: pluginVersion(), artifact: v.artifact };
    append(file, run);
    return { run };
  } catch (e) {
    return failed(e);
  }
}

// A log's JSON lines; a torn or blank line is skipped, never fatal, and a missing file has none.
function logLines<T>(file: string): Partial<T>[] {
  const out: Partial<T>[] = [];
  for (const line of existsSync(file) ? readFileSync(file, "utf8").split("\n") : []) {
    try {
      const v = JSON.parse(line) as unknown;
      if (v && typeof v === "object") out.push(v as Partial<T>);
    } catch {
      continue;
    }
  }
  return out;
}

/** The runs of one skill step (`step` exactly as a Signal stores it, `""` for none), keyed by plugin version. */
export function runCounts(repo: string, skill: string, step: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const r of logLines<Run>(runsFile(stateEnv(process.env), repo))) {
    if (r.skill === skill && r.step === step && typeof r.version === "string") counts[r.version] = (counts[r.version] ?? 0) + 1;
  }
  return counts;
}

/**
 * A line of the decisions log beside the Signal log: a grouped issue `created` (written the moment it exists, so a
 * failure later in the run cannot lead to a second one), a candidate `filed`, or a candidate `skipped`.
 */
export type Decision = { at: string; fingerprint: string; decision: "created" | "filed" | "skipped"; issue?: number };

// owner__repo.feedback.jsonl beside the Signal log.
export const decisionsFile = (env: { XDG_STATE_HOME?: string; HOME: string }, repo: string): string => signalsFile(env, repo).replace(/\.signals\.jsonl$/, ".feedback.jsonl");

/** Appends a decision to the repo's decisions log. It touches no GitHub state. */
export function recordDecision(repo: string, d: Omit<Decision, "at">): Decision {
  const decision: Decision = { at: new Date().toISOString(), ...d };
  append(decisionsFile(stateEnv(process.env), repo), decision);
  return decision;
}

/** The repo's decisions, oldest first; a torn or blank line is skipped. */
export const readDecisions = (repo: string): Partial<Decision>[] => logLines<Decision>(decisionsFile(stateEnv(process.env), repo));

// The log's Signals grouped by fingerprint, with each group's latest `at`, the lowest mode they carry (a value that is
// no mode is ignored) and the other repos they are about.
function groups(repo: string): Map<string, { c: FeedbackCandidate; latest: number }> {
  const out = new Map<string, { c: FeedbackCandidate; latest: number }>();
  for (const s of logLines<Signal>(signalsFile(stateEnv(process.env), repo)) as Signal[]) {
    if (typeof s.fingerprint !== "string") continue;
    const g = out.get(s.fingerprint) ?? { c: { fingerprint: s.fingerprint, skill: s.skill, step: s.step, category: s.category, count: 0, versions: {}, evidence: [] }, latest: -Infinity };
    g.c.count++;
    g.c.versions[s.version] = (g.c.versions[s.version] ?? 0) + 1;
    g.c.evidence.push(s.evidence);
    if (SELF_IMPROVEMENT_MODES.includes(s.mode!)) g.c.mode = lowerMode(g.c.mode ?? "Full Detail", s.mode!);
    if (typeof s.about === "string" && !g.c.about?.includes(s.about)) g.c.about = [...(g.c.about ?? []), s.about];
    g.latest = Math.max(g.latest, Date.parse(s.at));
    out.set(s.fingerprint, g);
  }
  return out;
}

/** One fingerprint's group over every Signal in the log, whatever was decided on it; null when the log has none. */
export const candidate = (repo: string, fp: string): FeedbackCandidate | null => groups(repo).get(fp)?.c ?? null;

// The log's Signals grouped by fingerprint, most Signals first, then by fingerprint; none when there is no log yet.
// A skipped fingerprint never comes back, and a filed one only once a Signal later than its last filing is recorded;
// a created line alone leaves the candidate pending.
export function pendingCandidates(repo: string): FeedbackCandidate[] {
  const skipped = new Set<string>();
  const filed = new Map<string, number>();
  for (const d of readDecisions(repo)) {
    if (typeof d.fingerprint !== "string") continue;
    if (d.decision === "skipped") skipped.add(d.fingerprint);
    if (d.decision === "filed") filed.set(d.fingerprint, Math.max(filed.get(d.fingerprint) ?? -Infinity, Date.parse(d.at ?? "")));
  }
  return [...groups(repo).values()]
    .filter((g) => !skipped.has(g.c.fingerprint) && !(g.latest <= (filed.get(g.c.fingerprint) ?? -Infinity)))
    .map((g) => g.c)
    .sort((a, b) => b.count - a.count || (a.fingerprint < b.fingerprint ? -1 : a.fingerprint > b.fingerprint ? 1 : 0));
}
