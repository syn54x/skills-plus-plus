// The Signal log: one JSONL file per repository beside the notes log, each line one Signal (a correction charged to the
// skill step and plugin version that made the corrected artifact). `recordSignal` is the only writer and checks both
// gates itself, so no caller can forget them; `pendingCandidates` reads the log grouped by fingerprint.
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname } from "node:path";
import { isAttended } from "./attended.ts";
import { notesFile } from "./notes-log.ts";
import { readSelfImprovementMode } from "./routing.ts";

// The 15 categories of skills/close-epic/FEEDBACK.md, then the four the Signal sources add.
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

// owner__repo.signals.jsonl in the notes log's directory.
export const signalsFile = (env: { XDG_STATE_HOME?: string; HOME: string }, repo: string): string => notesFile(env, repo).replace(/\.jsonl$/, ".signals.jsonl");

export const fingerprint = (skill: string, step: string, category: SignalCategory): string =>
  createHash("sha256").update(`${skill}\n${step}\n${category}`).digest("hex").slice(0, 12);

// The sources run from spp/src and the npm package from dist/, one level nearer package.json.
const PACKAGE = new URL(import.meta.url.endsWith(".ts") ? "../../package.json" : "../package.json", import.meta.url);
const pluginVersion = () => (JSON.parse(readFileSync(PACKAGE, "utf8")) as { version: string }).version;

const logFile = (env: NodeJS.ProcessEnv, repo: string) => signalsFile({ XDG_STATE_HOME: env.XDG_STATE_HOME, HOME: env.HOME || homedir() }, repo);

export function recordSignal(
  input: { repo: string; category: SignalCategory; skill: string; step?: string; evidence: string; version?: string },
  env: NodeJS.ProcessEnv = process.env,
  dir: string = process.cwd(),
): { signal: Signal } | { skipped: "CI" | "not an attended session" | "Self-improvement mode is Off" } {
  if (env.CI) return { skipped: "CI" };
  if (!isAttended(env)) return { skipped: "not an attended session" };
  if (readSelfImprovementMode(dir) === "Off") return { skipped: "Self-improvement mode is Off" };
  const step = input.step ?? "";
  const signal: Signal = {
    at: new Date().toISOString(),
    repo: input.repo,
    category: input.category,
    skill: input.skill,
    step,
    version: input.version ?? pluginVersion(),
    evidence: input.evidence,
    fingerprint: fingerprint(input.skill, step, input.category),
  };
  const file = logFile(env, input.repo);
  mkdirSync(dirname(file), { recursive: true });
  appendFileSync(file, JSON.stringify(signal) + "\n");
  return { signal };
}

// The log's Signals grouped by fingerprint, most Signals first, then by fingerprint; none when there is no log yet.
export function pendingCandidates(repo: string): FeedbackCandidate[] {
  const file = logFile(process.env, repo);
  const groups = new Map<string, FeedbackCandidate>();
  for (const line of existsSync(file) ? readFileSync(file, "utf8").split("\n") : []) {
    let s: Signal;
    try {
      s = JSON.parse(line) as Signal;
    } catch {
      continue; // a torn or blank line is skipped, never fatal
    }
    if (typeof s?.fingerprint !== "string") continue;
    const c = groups.get(s.fingerprint) ?? { fingerprint: s.fingerprint, skill: s.skill, step: s.step, category: s.category, count: 0, versions: {}, evidence: [] };
    c.count++;
    c.versions[s.version] = (c.versions[s.version] ?? 0) + 1;
    c.evidence.push(s.evidence);
    groups.set(s.fingerprint, c);
  }
  return [...groups.values()].sort((a, b) => b.count - a.count || (a.fingerprint < b.fingerprint ? -1 : a.fingerprint > b.fingerprint ? 1 : 0));
}
