// Pins the files /setup-spp writes from: the Routing block template must parse with parseRouting once its slots are
// filled, and the label table must name every label the pipeline reaches for.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { parseRouting } from "../../spp/src/routing.ts";

const here = dirname(fileURLToPath(import.meta.url));
const read = (name: string) => readFileSync(join(here, name), "utf8");

const template = /```markdown\n(<!-- sdd-routing -->[\s\S]*?<!-- \/sdd-routing -->)\n```/.exec(read("BLOCKS.md"))?.[1] ?? "";

// Fills every {{slot}}; a slot left over or a value for a slot the template lacks is a failure, so the template and this map cannot drift.
function fill(values: Record<string, string>): string {
  const used = new Set<string>();
  const text = template.replace(/\{\{(\w+)\}\}/g, (_, slot: string) => {
    used.add(slot);
    assert.ok(slot in values, `template slot {{${slot}}} has no value`);
    return values[slot];
  });
  assert.deepEqual([...used].sort(), Object.keys(values).sort());
  return text;
}

const answers = { mode: "org", sizes: "`size:S/M/L` labels", feedback: "off", laws: "CLAUDE.md, GLOSSARY.md, docs/adr/" };

// What a run does to an optional line: drop it when there is nothing to put in it.
const without = (text: string, field: string) => text.replace(new RegExp(`^- ${field}:.*\\n`, "m"), "");

describe("the Routing block template", () => {
  test("is found in BLOCKS.md between the markers", () => {
    assert.ok(template.startsWith("<!-- sdd-routing -->"));
  });

  test("without a Panel line parses with Mode, Sizes, Laws and the default thresholds", () => {
    const text = without(without(fill({ ...answers, panel: "", merge: "" }), "Panel"), "Merge");
    assert.deepEqual(parseRouting(text), {
      mode: "org",
      sizes: "`size:S/M/L` labels",
      laws: ["CLAUDE.md", "GLOSSARY.md", "docs/adr/"],
      panel: { tickets: 4, sizeL: true, lines: 1000 },
      selfImprovement: "Off",
    });
  });

  test("with a Panel line parses the override", () => {
    const routing = parseRouting(without(fill({ ...answers, mode: "labels-only", panel: "tickets>=6, size:L, lines>=1500", merge: "" }), "Merge"));
    assert.equal(routing.mode, "labels-only");
    assert.deepEqual(routing.panel, { tickets: 6, sizeL: true, lines: 1500 });
  });
});

describe("a block that already holds a Merge line", () => {
  const existing = without(fill({ ...answers, panel: "", merge: "rebase" }), "Panel");

  test("keeps its Merge method when parsed, so a re-run has nothing to change", () => {
    assert.equal(parseRouting(existing).merge, "rebase");
  });

  test("a block with no Merge line leaves it unset", () => {
    assert.equal(parseRouting(without(without(fill({ ...answers, panel: "", merge: "" }), "Panel"), "Merge")).merge, undefined);
  });

  test("every field parseRouting reads has a line in the template", () => {
    const source = readFileSync(join(here, "../../spp/src/routing.ts"), "utf8");
    const fields = [...source.matchAll(/field\("([\w ]+)"\)/g)].map((m) => m[1]);
    assert.deepEqual(fields.filter((f) => !new RegExp(`^- ${f}:`, "m").test(template)), []);
  });
});

describe("the label table", () => {
  const names = [...read("GITHUB.md").matchAll(/^\| `([^`]+)` \|/gm)].map((m) => m[1]);

  test("names the five triage roles, the claim mark, needs-plan, blocked, the sizes and the wayfinder labels", () => {
    const wanted = [
      "needs-triage", "needs-info", "ready-for-agent", "ready-for-human", "wontfix",
      "claimed", "needs-plan", "blocked", "size:S", "size:M", "size:L",
      "wayfinder:map", "wayfinder:research", "wayfinder:prototype", "wayfinder:grilling", "wayfinder:task",
    ];
    assert.deepEqual(wanted.filter((n) => !names.includes(n)), []);
  });

  test("lists no label twice", () => {
    assert.equal(new Set(names).size, names.length);
  });
});
