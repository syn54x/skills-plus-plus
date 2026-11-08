// The Routing block: the lines between `<!-- sdd-routing -->` and `<!-- /sdd-routing -->` in a repo's CLAUDE.md or
// AGENTS.md. `parseRouting` is pure (text in, Routing out); `readRouting` is the one place that touches the filesystem.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** The Self-improvement mode: the most a skill-feedback issue may say about the repo's work; under Off nothing is recorded or filed. */
export type SelfImprovementMode = "Off" | "Anonymous" | "Full Detail";

/** A repo's Routing block, parsed: the `--json` shape of `spp preflight`. */
export type Routing = {
  /** The `Mode:` line. */
  mode: "org" | "labels-only";
  /** The `Sizes:` line, as written. */
  sizes: string;
  /** The documents on the `Laws:` line. */
  laws: string[];
  /** When the main gate runs the review panel: at `tickets` Sub-issues or more, on any size L ticket when `sizeL`, or at `lines` changed lines or more. */
  panel: { tickets: number; sizeL: boolean; lines: number };
  /** The `Self-improvement mode:` line, else an old `Upstream feedback:` line migrated; a missing or unknown value is Off. */
  selfImprovement: SelfImprovementMode;
  /** How `spp merge` merges a slice; absent means squash. */
  merge?: "squash" | "merge" | "rebase";
};

const MERGE_METHODS = ["squash", "merge", "rebase"];
const MODES = new Map<string, SelfImprovementMode>([["off", "Off"], ["anonymous", "Anonymous"], ["full detail", "Full Detail"]]);
// The old `Upstream feedback:` profiles, each mapped to the mode that keeps its outbound rules.
const UPSTREAM = new Map<string, SelfImprovementMode>([["off", "Off"], ["counts", "Anonymous"], ["detailed", "Anonymous"], ["attributed", "Full Detail"]]);

const ROUTING_FILES = ["CLAUDE.md", "AGENTS.md"];
const PANEL_DEFAULT = { tickets: 4, sizeL: true, lines: 1000 };

// `Panel: tickets>=6, no-size-L, lines>=1000`: each token overrides one threshold, the rest keep their defaults.
// `size:L` keeps the size-L trigger on (the default) and `no-size-L` turns it off.
function parsePanel(value: string): Routing["panel"] {
  const panel = { ...PANEL_DEFAULT };
  const tokens = value.split(",").map((t) => t.trim()).filter(Boolean);
  if (tokens.includes("size:L") && tokens.includes("no-size-L")) throw new Error("Routing block: Panel cannot hold both size:L and no-size-L");
  for (const token of tokens) {
    const m = /^(tickets|lines)\s*>=\s*(\d+)$/.exec(token);
    if (m) panel[m[1] as "tickets" | "lines"] = Number(m[2]);
    else if (token === "size:L" || token === "no-size-L") panel.sizeL = token === "size:L";
    else throw new Error(`Routing block: unknown Panel threshold "${token}" (use tickets>=N, size:L, no-size-L, lines>=N)`);
  }
  return panel;
}

export function parseRouting(text: string): Routing {
  const block = /<!-- sdd-routing -->([\s\S]*?)<!-- \/sdd-routing -->/.exec(text.replace(/\r/g, ""));
  if (!block) throw new Error("no Routing block (<!-- sdd-routing -->) in the text");
  const field = (name: string) => new RegExp(`^[-*]\\s*${name}\\s*:\\s*(.*?)\\s*$`, "im").exec(block[1])?.[1];
  const mode = field("Mode");
  if (mode !== "org" && mode !== "labels-only") throw new Error(`Routing block: Mode must be org or labels-only, got ${mode === undefined ? "nothing" : `"${mode}"`}`);
  const merge = field("Merge");
  if (merge !== undefined && !MERGE_METHODS.includes(merge)) throw new Error(`Routing block: Merge must be squash, merge or rebase, got "${merge}"`);
  const improve = field("Self-improvement mode");
  const selfImprovement = improve !== undefined ? MODES.get(improve.toLowerCase()) : UPSTREAM.get(field("Upstream feedback") ?? "");
  return {
    mode,
    sizes: field("Sizes") ?? "",
    laws: (field("Laws") ?? "").split(",").map((l) => l.trim()).filter(Boolean),
    panel: parsePanel(field("Panel") ?? ""),
    selfImprovement: selfImprovement ?? "Off",
    ...(merge && { merge: merge as Routing["merge"] }),
  };
}

// The first of CLAUDE.md and AGENTS.md in `dir` that carries a Routing block, with the file's name; null when neither does.
export function readRouting(dir: string): { file: string; routing: Routing } | null {
  for (const file of ROUTING_FILES) {
    const path = join(dir, file);
    if (!existsSync(path)) continue;
    const text = readFileSync(path, "utf8");
    if (text.includes("<!-- sdd-routing -->")) return { file, routing: parseRouting(text) };
  }
  return null;
}

// The repo's Self-improvement mode; Off when `dir` has no Routing block.
export const readSelfImprovementMode = (dir: string): SelfImprovementMode => readRouting(dir)?.routing.selfImprovement ?? "Off";
