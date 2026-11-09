// The Signal log: one JSONL file per repository beside the notes log, each line one Signal (a correction charged to the
// skill step and plugin version that made the corrected artifact). `recordSignal` is the only writer and checks the
// gates itself (`collecting`), so no caller can forget them; `pendingCandidates` reads the log grouped by fingerprint.
// The runs log beside it counts each skill step's runs, the denominator every report needs.
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname } from "node:path";
import { isAttended } from "./attended.ts";
import { notesFile } from "./notes-log.ts";
import { currentRepo } from "./notes.ts";
import { readSelfImprovementMode } from "./routing.ts";

/** The categories a Signal may carry: the 15 of `skills/close-epic/FEEDBACK.md`, then the four the Signal sources add. */
export const SIGNAL_CATEGORIES = [
  "verify-unrunnable", "contract-gap", "missed-edge", "undeclared-deviation", "brief-gap", "fix-round", "law-told",
  "law-not-told", "human-needed", "panel-noise", "panel-gap", "hook-wrong", "driver-failed", "step-unclear", "other",
  "fix-regression", "contract-edited", "wish", "escaped-defect",
] as const satisfies readonly string[];

/** What a Signal says was corrected: one of the categories `spp signal --help` lists. */
export type SignalCategory = (typeof SIGNAL_CATEGORIES)[number];

export type Signal = { at: string; repo: string; category: SignalCategory; skill: string; step: string; version: string; evidence: string; fingerprint: string };

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
};

/** One artifact a skill step made or took over: a line of the runs log. */
export type Run = { at: string; repo: string; skill: string; step: string; version: string; artifact: string };

type Skipped = { skipped: "CI" | "not an attended session" | "Self-improvement mode is Off" };

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

// The Attended check, with a worker's passed-down decision when the checkout in `dir` names its repo. A checkout
// with no GitHub origin falls back to the harness signal, so a missing origin never decides the gate.
function attended(env: NodeJS.ProcessEnv, dir: string): boolean {
  let repo: string;
  try {
    repo = currentRepo(dir);
  } catch {
    return isAttended(env);
  }
  return isAttended(env, { repo, dir });
}

/**
 * The one gate: true when `recordSignal` and `recordRun` would record. Never under `CI`, only in an Attended session,
 * and not when the Routing block in `dir` sets the Self-improvement mode to Off. The mode is read before the Attended
 * check, which gives the same answer and spawns no process in an Off repo.
 */
export function collecting(env: NodeJS.ProcessEnv = process.env, dir: string = process.cwd()): boolean {
  return !env.CI && readSelfImprovementMode(dir) !== "Off" && attended(env, dir);
}

// Why nothing would be recorded, in the gate order CI, Attended session, Self-improvement mode; null when it would.
function skipped(env: NodeJS.ProcessEnv, dir: string): Skipped | null {
  if (collecting(env, dir)) return null;
  if (env.CI) return { skipped: "CI" };
  return { skipped: attended(env, dir) ? "Self-improvement mode is Off" : "not an attended session" };
}

const failed = (e: unknown) => ({ failed: e instanceof Error ? e.message : String(e) });

function append(file: string, line: unknown): void {
  mkdirSync(dirname(file), { recursive: true });
  appendFileSync(file, JSON.stringify(line) + "\n");
}

/**
 * Appends one Signal to the repo's Signal log, or says why not. Without `repo`, the origin of the checkout in `dir`
 * is used, resolved only once `collecting` says yes. It never throws: an error resolving the repo, reading
 * `package.json` or writing the log comes back as `failed`.
 */
export function recordSignal(
  input: { repo?: string; category: SignalCategory; skill: string; step?: string; evidence: string; version?: string },
  env: NodeJS.ProcessEnv = process.env,
  dir: string = process.cwd(),
): { signal: Signal } | Skipped | { failed: string } {
  try {
    const skip = skipped(env, dir);
    if (skip) return skip;
    const repo = input.repo ?? currentRepo(dir);
    const step = input.step ?? "";
    const signal: Signal = {
      at: new Date().toISOString(),
      repo,
      category: input.category,
      skill: input.skill,
      step,
      version: input.version ?? pluginVersion(),
      evidence: input.evidence,
      fingerprint: fingerprint(input.skill, step, input.category),
    };
    append(signalsFile(stateEnv(env), repo), signal);
    return { signal };
  } catch (e) {
    return failed(e);
  }
}

/** Appends one run of a skill step to the repo's runs log behind the same gate as `recordSignal`; it never throws. */
export function recordRun(
  input: { repo: string; skill: string; step?: string; artifact: string },
  env: NodeJS.ProcessEnv = process.env,
  dir: string = process.cwd(),
): { run: Run } | Skipped | { failed: string } {
  try {
    const skip = skipped(env, dir);
    if (skip) return skip;
    const run: Run = { at: new Date().toISOString(), repo: input.repo, skill: input.skill, step: input.step ?? "", version: pluginVersion(), artifact: input.artifact };
    append(runsFile(stateEnv(env), input.repo), run);
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

/** A person's decision on a candidate: a line of the decisions log beside the Signal log. */
export type Decision = { at: string; fingerprint: string; decision: "filed" | "skipped"; issue?: number };

// owner__repo.feedback.jsonl beside the Signal log.
export const decisionsFile = (env: { XDG_STATE_HOME?: string; HOME: string }, repo: string): string => signalsFile(env, repo).replace(/\.signals\.jsonl$/, ".feedback.jsonl");

/** Appends a filed or skipped decision to the repo's decisions log. It touches no GitHub state. */
export function recordDecision(repo: string, d: Omit<Decision, "at">): Decision {
  const decision: Decision = { at: new Date().toISOString(), ...d };
  append(decisionsFile(stateEnv(process.env), repo), decision);
  return decision;
}

/** The repo's decisions, oldest first; a torn or blank line is skipped. */
export const readDecisions = (repo: string): Partial<Decision>[] => logLines<Decision>(decisionsFile(stateEnv(process.env), repo));

// The log's Signals grouped by fingerprint, with each group's latest `at`.
function groups(repo: string): Map<string, { c: FeedbackCandidate; latest: number }> {
  const out = new Map<string, { c: FeedbackCandidate; latest: number }>();
  for (const s of logLines<Signal>(signalsFile(stateEnv(process.env), repo)) as Signal[]) {
    if (typeof s.fingerprint !== "string") continue;
    const g = out.get(s.fingerprint) ?? { c: { fingerprint: s.fingerprint, skill: s.skill, step: s.step, category: s.category, count: 0, versions: {}, evidence: [] }, latest: -Infinity };
    g.c.count++;
    g.c.versions[s.version] = (g.c.versions[s.version] ?? 0) + 1;
    g.c.evidence.push(s.evidence);
    g.latest = Math.max(g.latest, Date.parse(s.at));
    out.set(s.fingerprint, g);
  }
  return out;
}

/** One fingerprint's group over every Signal in the log, whatever was decided on it; null when the log has none. */
export const candidate = (repo: string, fp: string): FeedbackCandidate | null => groups(repo).get(fp)?.c ?? null;

// The log's Signals grouped by fingerprint, most Signals first, then by fingerprint; none when there is no log yet.
// A skipped fingerprint never comes back, and a filed one only once a Signal later than its last filing is recorded.
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
