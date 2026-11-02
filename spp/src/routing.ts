// The Routing block: the lines between `<!-- sdd-routing -->` and `<!-- /sdd-routing -->` in a repo's CLAUDE.md or
// AGENTS.md. `parseRouting` is pure (text in, Routing out); `readRouting` is the one place that touches the filesystem.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** The upstream feedback profile, which sets what a skill-feedback issue may say; under `off` nothing may be filed. */
export type UpstreamFeedback = "off" | "counts" | "detailed" | "attributed";

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
  /** How much a skill-feedback issue may say; a missing or unknown value is off. */
  upstreamFeedback: UpstreamFeedback;
  /** How `spp merge` merges a slice; absent means squash. */
  merge?: "squash" | "merge" | "rebase";
};

const MERGE_METHODS = ["squash", "merge", "rebase"];
const FEEDBACK_PROFILES = ["counts", "detailed", "attributed"];

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
  const feedback = field("Upstream feedback") ?? "";
  return {
    mode,
    sizes: field("Sizes") ?? "",
    laws: (field("Laws") ?? "").split(",").map((l) => l.trim()).filter(Boolean),
    panel: parsePanel(field("Panel") ?? ""),
    upstreamFeedback: FEEDBACK_PROFILES.includes(feedback) ? (feedback as UpstreamFeedback) : "off",
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
