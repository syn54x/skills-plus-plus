// spp findings merge <file...> [--json] [--verdict <round> ...]: reads each Persona's findings JSON and prints the
// one deduplicated list, and with --verdict the panel's verdict over it.
import { readFileSync } from "node:fs";
import { mergeFindings, panelVerdict, parsePersonaFindings, type MergeResult, type Readings } from "../findings.ts";
import { guarded, UsageError } from "../markers.ts";

const USAGE = `usage: spp findings merge <file...> [--json]
         [--verdict <round> --spec pass|fail --coherence pass|fail --verify pass|fail
          --checks pass|fail|pending|none [--missing name,name]]
Each file is { "persona": NAME, "findings": [{ file, line, title, severity, confidence, law?, body }] }.
Findings under 80 confidence are dropped; findings on the same file, within 5 lines, with the same normalised
title merge into one that keeps the highest severity and every persona. --json prints
{ findings, counts: { severity, persona } }.
--verdict adds the panel's verdict (MERGE, FIX FIRST or HUMAN DECISION) as a last "Verdict:" line, or a "verdict"
key with --json. <round> is 1 for the first panel; from round 3 a FIX FIRST is written HUMAN DECISION. The other
flags are the readings the verdict also depends on; --missing names Personas that never reported.
`;

const VALUE_FLAGS = ["--verdict", "--spec", "--coherence", "--verify", "--checks", "--missing"];

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
    const stray = VALUE_FLAGS.find((f) => f !== "--verdict" && values.has(f) && !r);
    if (stray) throw new UsageError(`${stray} goes with --verdict`);
    const result = mergeFindings(files.map(load));
    const verdict = r && panelVerdict(result, r);
    if (json) process.stdout.write(JSON.stringify({ findings: result.findings, counts: result.counts, ...(verdict && { verdict }) }, null, 2) + "\n");
    else process.stdout.write(render(result) + (verdict ? `Verdict: ${verdict}\n` : ""));
  });
}
