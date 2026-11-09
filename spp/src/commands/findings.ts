/**
 * `spp findings merge <file...> [--json] [--verdict <round> ...] [--fix-diff <file>]` merges the review panel's Persona findings. Each
 * file is one {@link PersonaFindings}. Findings under 80 confidence are dropped. The rest merge in two passes per file:
 * findings with the same normalised title, less than 5 lines from the first of them, form a title cluster; then title
 * clusters whose first lines are less than 5 lines from the first line of the group they join fold into one finding
 * whatever their titles, so a defect that several Personas word differently counts once. A title cluster is never
 * split. The merged finding keeps the highest severity and every Persona, and its body ends with one
 * `Also reported as: <title> (<Persona>, line <line>)` line for each other title. Its Law tag is the speaking
 * finding's when that cites one. A tagged title (`ticket-mandated:`, `Candidate ADR:`, `Check after deploy:` or
 * `Terminology`) merges only with its own tag.
 * `--verdict` adds the panel's verdict over the merged list, as a last `Verdict:` line or, with `--json`, a `verdict`
 * key; from round 3 a FIX FIRST is written HUMAN DECISION. With `--json` it prints {@link PanelFindings}.
 * `--fix-diff` names the patch of the fixes the round reviewed: each merged finding with any of its findings on a line
 * that patch added or changed, and not merged with a `recheck-` file's finding, records a `fix-regression` Signal (the Signal gates apply),
 * and a line on stderr says whether it was recorded. Each merge with `--fix-diff` also records one run of
 * `implement-issue` step `fix round`, which is what the fix-regression rate is counted over. The run is named by the
 * patch's content, `fix diff <hash>` (the first 12 hex characters of its SHA-256), after `pull request <N>` when the
 * patch sits in the panel's `spp-panel-<N>` folder, so merging the same round again records no second run. stdout, the `--json` shape and the exit code do not change.
 *
 * @module
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { basename, dirname, resolve } from "node:path";
import { changedLines, mergeFindings, panelVerdict, parsePersonaFindings, type MergeResult, type Merged, type PanelVerdict, type Readings } from "../findings.ts";
import { guarded, UsageError } from "../markers.ts";
import { recordRun, recordSignal } from "../signals.ts";

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
Findings under 80 confidence are dropped. On one file, findings with the same normalised title merge within 5 lines of
the first of them; then those title groups merge whatever their titles when a group's first line is within 5 lines of
the first line of the merged group. The result keeps the highest severity and every persona, with an
"Also reported as: <title> (<persona>, line <line>)" line in the body for each other title. A title that starts
ticket-mandated:, Candidate ADR:, Check after deploy: or Terminology merges only with findings that start the same
way. --json prints { findings, counts: { severity, persona } }.
--verdict adds the panel's verdict (MERGE, FIX FIRST or HUMAN DECISION) as a last "Verdict:" line, or a "verdict"
key with --json. <round> is 1 for the first panel; from round 3 a FIX FIRST is written HUMAN DECISION. The other
flags are the readings the verdict also depends on; --missing names Personas that never reported.
--fix-diff <file> is the patch of the fixes made since the previous round. A merged finding with any of its findings
on a line it added or changed, and not merged with a finding from a recheck-* file, records a fix-regression Signal; stderr gets one
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

// A fix round's run name: the patch's content hash, after the pull request its spp-panel-<N> folder names.
function fixRound(path: string, patch: string): string {
  const pr = /^spp-panel-(\d+)$/.exec(basename(dirname(resolve(path))))?.[1];
  return `${pr ? `pull request ${pr} ` : ""}fix diff ${createHash("sha256").update(patch).digest("hex").slice(0, 12)}`;
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

// Each fix round the panel looked at counts one run of `implement-issue` step `fix round`, silently: the denominator
// of the fix-regression rate, whether or not a finding regressed. `run` names the round by its patch's content, since
// the panel's round number starts again at 1 on a fresh run, so merging the same round again adds no run. Then one
// fix-regression Signal per merged finding on a changed line (any line it absorbed) that no recheck finding was merged
// into, and one stderr line each. recordRun and recordSignal apply the gates and never throw, so nothing here changes the exit code.
async function recordRegressions(result: MergeResult, patch: string, name: string, run: string): Promise<void> {
  await recordRun({ skill: "implement-issue", step: "fix round", artifact: run });
  const changed = changedLines(patch);
  // A merged finding stands on every line its findings sat on, so a neighbour on a context line cannot hide a changed one.
  const regressed = result.findings.flatMap((f) => {
    const line = result.recheck.includes(f.id) ? undefined : result.lines[f.id].find((l) => changed.get(f.file)?.has(l));
    return line === undefined ? [] : [{ f, line }];
  });
  for (const { f, line } of regressed) {
    const evidence = `${f.id} ${f.file}:${line} is on a line ${name} changed: ${f.title}`;
    const r = await recordSignal({ category: "fix-regression", skill: "implement-issue", step: "fix round", evidence });
    const outcome = "skipped" in r ? `not recorded: ${r.skipped}` : "failed" in r ? `not recorded: ${r.failed}` : "recorded";
    process.stderr.write(`fix-regression ${f.id} ${outcome}\n`);
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
    if (patch !== undefined && fixDiff !== undefined) await recordRegressions(result, patch, basename(fixDiff), fixRound(fixDiff, patch));
  });
}
