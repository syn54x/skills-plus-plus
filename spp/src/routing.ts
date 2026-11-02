// The Routing block: the lines between `<!-- sdd-routing -->` and `<!-- /sdd-routing -->` in a repo's CLAUDE.md or
// AGENTS.md. `parseRouting` is pure (text in, Routing out); `readRouting` is the one place that touches the filesystem.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type Routing = {
  mode: "org" | "labels-only";
  sizes: string;
  laws: string[];
  panel: { tickets: number; sizeL: boolean; lines: number };
};

export const ROUTING_FILES = ["CLAUDE.md", "AGENTS.md"];
const PANEL_DEFAULT = { tickets: 4, sizeL: true, lines: 1000 };

// `Panel: tickets>=6, size:L, lines>=1000`: each token overrides one threshold, the rest keep their defaults.
function parsePanel(value: string): Routing["panel"] {
  const panel = { ...PANEL_DEFAULT };
  for (const token of value.split(",").map((t) => t.trim()).filter(Boolean)) {
    const m = /^(tickets|lines)\s*>=\s*(\d+)$/.exec(token);
    if (m) panel[m[1] as "tickets" | "lines"] = Number(m[2]);
    else if (token === "size:L") panel.sizeL = true;
    else throw new Error(`Routing block: unknown Panel threshold "${token}" (use tickets>=N, size:L, lines>=N)`);
  }
  return panel;
}

export function parseRouting(text: string): Routing {
  const block = /<!-- sdd-routing -->([\s\S]*?)<!-- \/sdd-routing -->/.exec(text.replace(/\r/g, ""));
  if (!block) throw new Error("no Routing block (<!-- sdd-routing -->) in the text");
  const field = (name: string) => new RegExp(`^[-*]\\s*${name}\\s*:\\s*(.*?)\\s*$`, "im").exec(block[1])?.[1];
  const mode = field("Mode");
  if (mode !== "org" && mode !== "labels-only") throw new Error(`Routing block: Mode must be org or labels-only, got ${mode === undefined ? "nothing" : `"${mode}"`}`);
  return {
    mode,
    sizes: field("Sizes") ?? "",
    laws: (field("Laws") ?? "").split(",").map((l) => l.trim()).filter(Boolean),
    panel: parsePanel(field("Panel") ?? ""),
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
