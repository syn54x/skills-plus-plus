// spp findings merge <file...> [--json]: reads each Persona's findings JSON and prints the one deduplicated list.
import { readFileSync } from "node:fs";
import { mergeFindings, parsePersonaFindings, type MergeResult } from "../findings.ts";
import { guarded, UsageError } from "../markers.ts";

const USAGE = `usage: spp findings merge <file...> [--json]
Each file is { "persona": NAME, "findings": [{ file, line, title, severity, confidence, law?, body }] }.
Findings under 80 confidence are dropped; findings on the same file, within 5 lines, with the same normalised
title merge into one that keeps the highest severity and every persona. --json prints
{ findings, counts: { severity, persona } }.
`;

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
    const flags = rest.filter((a) => a.startsWith("--"));
    const bad = flags.find((a) => a !== "--json");
    if (bad) throw new UsageError(`unknown flag ${bad}`);
    const files = rest.filter((a) => !a.startsWith("--"));
    if (!files.length) throw new UsageError("merge needs at least one file");
    const result = mergeFindings(files.map(load));
    process.stdout.write(flags.length ? JSON.stringify({ findings: result.findings, counts: result.counts }, null, 2) + "\n" : render(result));
  });
}
