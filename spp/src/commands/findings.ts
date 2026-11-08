/**
 * `spp findings merge <file...> [--json] [--verdict <round> ...] [--fix-diff <file>]` merges the review panel's Persona findings. Each
 * file is one {@link PersonaFindings}. Findings under 80 confidence are dropped, and findings on the same file,
 * less than 5 lines apart and with the same normalised title become one that keeps the highest severity and every Persona.
 * `--verdict` adds the panel's verdict over the merged list, as a last `Verdict:` line or, with `--json`, a `verdict`
 * key; from round 3 a FIX FIRST is written HUMAN DECISION. With `--json` it prints {@link PanelFindings}.
 * `--fix-diff` names the patch of the fixes the round reviewed: each merged finding on a line that patch added or
 * changed, and not merged with a `recheck-` file's finding, records a `fix-regression` Signal (the Signal gates apply),
 * and a line on stderr says whether it was recorded. stdout, the `--json` shape and the exit code do not change.
 *
 * @module
 */
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { changedLines, mergeFindings, panelVerdict, parsePersonaFindings, type MergeResult, type Merged, type PanelVerdict, type Readings } from "../findings.ts";
import { guarded, UsageError } from "../markers.ts";
import { isAttended } from "../attended.ts";
import { currentRepo } from "../notes.ts";
import { readSelfImprovementMode } from "../routing.ts";
import { recordSignal } from "../signals.ts";

export type { Finding, Merged, PanelVerdict, PersonaFindings, Severity } from "../findings.ts";

/** The panel's findings after the merge: the `--json` shape of `spp findings merge`. */
export type PanelFindings = {
  /** The merged findings, most severe first, then by file and line; the ids follow this order. */
  findings: Merged[];
  /** How many merged findings carry each severity, and how many name each Persona. */
  counts: { severity: Record<string, number>; persona: Record<string, number> };
  /** The panel's verdict, present only with `--verdict`. */
  verdict?: PanelVerdict;
};

/** The usage text `spp findings --help` prints. */
export const USAGE = `usage: spp findings merge <file...> [--json] [--fix-diff <file>]
         [--verdict <round> --spec pass|fail --coherence pass|fail --verify pass|fail
          --checks pass|fail|pending|none [--missing name,name]]
Each file is { "persona": NAME, "findings": [{ file, line, title, severity, confidence, law?, body }] }.
Findings under 80 confidence are dropped; findings on the same file, within 5 lines, with the same normalised
title merge into one that keeps the highest severity and every persona. --json prints
{ findings, counts: { severity, persona } }.
--verdict adds the panel's verdict (MERGE, FIX FIRST or HUMAN DECISION) as a last "Verdict:" line, or a "verdict"
key with --json. <round> is 1 for the first panel; from round 3 a FIX FIRST is written HUMAN DECISION. The other
flags are the readings the verdict also depends on; --missing names Personas that never reported.
--fix-diff <file> is the patch of the fixes made since the previous round. A merged finding on a line it added or
changed, and not merged with a finding from a recheck-* file, records a fix-regression Signal; stderr gets one
"fix-regression <id> recorded" or "fix-regression <id> not recorded: <reason>" line per such finding.
`;

const VALUE_FLAGS = ["--verdict", "--spec", "--coherence", "--verify", "--checks", "--missing", "--fix-diff"];

function readings(flags: Map<string, string>): Readings {
  const get = (name: string) => {
    const v = flags.get(name);
    if (v === undefined) throw new UsageError(`--verdict also needs ${name}`);
    return v;
  };
  const oneOf = <T extends string>(name: string, allowed: readonly T[]): T => {
    const v = get(name);
    if (!allowed.includes(v as T)) throw new UsageError(`${name} takes ${allowed.join(", ")}`);
    return v as T;
  };
  const round = get("--verdict");
  if (!/^[1-9]\d*$/.test(round)) throw new UsageError("--verdict takes a round number, 1 or more");
  const missing = flags.get("--missing");
  return {
    round: Number(round),
    spec: oneOf("--spec", ["pass", "fail"]),
    coherence: oneOf("--coherence", ["pass", "fail"]),
    verify: oneOf("--verify", ["pass", "fail"]),
    checks: oneOf("--checks", ["pass", "fail", "pending", "none"]),
    missing: missing && missing !== "none" ? missing.split(",") : [],
  };
}

function load(path: string) {
  let json: unknown;
  try {
    json = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    throw new Error(`${path}: ${e instanceof Error ? e.message : e}`);
  }
  return parsePersonaFindings(json, path);
}

const tally = (counts: Record<string, number>) => Object.entries(counts).map(([k, n]) => `${k} ${n}`).join(", ");

function render(r: MergeResult): string {
  return (
    [
      ...r.findings.flatMap((f) => [`${f.id} ${f.severity} ${f.file}:${f.line} [${f.personas.join(", ")}] ${f.title}${f.law ? ` [${f.law}]` : ""}`, ...f.body.split("\n").map((l) => `  ${l}`)]),
      `Severity: ${tally(r.counts.severity)}`,
      `Personas: ${tally(r.counts.persona)}`,
      `Dropped below confidence 80: ${r.dropped}`,
    ].join("\n") + "\n"
  );
}

// One fix-regression Signal per merged finding on a changed line that no recheck finding was merged into, and one
// stderr line each. Nothing here changes the exit code.
function recordRegressions(result: MergeResult, patch: string, name: string): void {
  const changed = changedLines(patch);
  const regressed = result.findings.filter((f) => !result.recheck.includes(f.id) && changed.get(f.file)?.has(f.line));
  if (!regressed.length) return;
  // The repo is read once. When it cannot be read, the gates still speak first, in recordSignal's order.
  let repo: string | undefined;
  let why = "";
  try {
    repo = currentRepo();
  } catch (e) {
    why = e instanceof Error ? e.message : String(e);
    if (process.env.CI) why = "CI";
    else if (!isAttended(process.env)) why = "not an attended session";
    else if (readSelfImprovementMode(process.cwd()) === "Off") why = "Self-improvement mode is Off";
  }
  for (const f of regressed) {
    const evidence = `${f.id} ${f.file}:${f.line} is on a line ${name} changed: ${f.title}`;
    const r = repo === undefined ? { skipped: why } : recordSignal({ repo, category: "fix-regression", skill: "implement-issue", step: "fix round", evidence });
    process.stderr.write(`fix-regression ${f.id} ${"skipped" in r ? `not recorded: ${r.skipped}` : "recorded"}\n`);
  }
}

/**
 * Merges Persona findings files and, with `--verdict`, gives the panel's verdict.
 *
 * @param args - `merge`, one or more findings files, `--json` for the {@link PanelFindings} shape, and for a verdict
 *   `--verdict <round>` with `--spec pass|fail`, `--coherence pass|fail`, `--verify pass|fail`,
 *   `--checks pass|fail|pending|none` and optionally `--missing name,name` (Personas that never reported). Apart from those, `--fix-diff <file>` records
 *   fix regressions as described above.
 * @returns 0 when it printed the merged list; 2 on a usage error, with the usage on stderr; 1 when a file cannot be
 *   read (the `--fix-diff` patch included) or does not hold Persona findings, with the reason on stderr.
 * @example
 * ```bash
 * spp findings merge correctness.json security.json --json
 * spp findings merge *.json --verdict 1 --spec pass --coherence pass --verify pass --checks pass
 * spp findings merge "$ROUND_DIR"/*.json --fix-diff "$PANEL_DIR/fix-2.patch"
 * ```
 */
export function run(args: string[]): Promise<number> {
  return guarded(() => "findings merge", USAGE, async () => {
    const [sub, ...rest] = args;
    if (sub !== "merge") throw new UsageError("findings takes merge");
    const files: string[] = [];
    const values = new Map<string, string>();
    let json = false;
    for (let i = 0; i < rest.length; i++) {
      const a = rest[i];
      if (a === "--json") json = true;
      else if (VALUE_FLAGS.includes(a)) {
        if (i + 1 >= rest.length) throw new UsageError(`${a} needs a value`);
        values.set(a, rest[++i]);
      } else if (a.startsWith("--")) throw new UsageError(`unknown flag ${a}`);
      else files.push(a);
    }
    if (!files.length) throw new UsageError("merge needs at least one file");
    // Readings are checked before any file is read, so a bad flag is a usage error and not a missing-file error.
    const r = values.has("--verdict") ? readings(values) : null;
    const stray = VALUE_FLAGS.find((f) => f !== "--verdict" && f !== "--fix-diff" && values.has(f) && !r);
    if (stray) throw new UsageError(`${stray} goes with --verdict`);
    const inputs = files.map(load);
    const fixDiff = values.get("--fix-diff");
    let patch: string | undefined;
    if (fixDiff !== undefined) {
      try {
        patch = readFileSync(fixDiff, "utf8");
      } catch (e) {
        throw new Error(`${fixDiff}: ${e instanceof Error ? e.message : e}`);
      }
    }
    const result = mergeFindings(inputs, new Set(inputs.filter((_, i) => basename(files[i]).startsWith("recheck-"))));
    const verdict = r && panelVerdict(result, r);
    const out: PanelFindings = { findings: result.findings, counts: result.counts, ...(verdict && { verdict }) };
    if (json) process.stdout.write(JSON.stringify(out, null, 2) + "\n");
    else process.stdout.write(render(result) + (verdict ? `Verdict: ${verdict}\n` : ""));
    if (patch !== undefined && fixDiff !== undefined) recordRegressions(result, patch, basename(fixDiff));
  });
}
