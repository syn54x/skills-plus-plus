import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { parseRouting } from "../src/routing.ts";
import { assertCase } from "./harness.ts";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => join(here, "fixtures", "preflight", name);

const block = (...lines: string[]) => `<!-- sdd-routing -->\n${lines.join("\n")}\n<!-- /sdd-routing -->`;

describe("happy path", () => {
  test("spp preflight 197 with every precondition met exits 0 with five ok lines", async () => {
    await assertCase("preflight", fixture("ok")); // expected.txt
  });

  test("--json prints the parsed Routing block", async () => {
    await assertCase("preflight", fixture("ok-json")); // expected.json
  });
});

describe("error path", () => {
  test("no plan comment exits 1 with the fix: run /to-tickets 197", async () => {
    const r = await assertCase("preflight", fixture("no-plan"), 1);
    assert.match(r.stderr, /run \/to-tickets 197/);
    assert.equal(r.stdout.split("\n").filter((l) => l.startsWith("ok:")).length, 3); // stops at the first failure
  });

  test("a closed epic exits 1 and says the epic is closed", async () => {
    const r = await assertCase("preflight", fixture("closed"), 1);
    assert.match(r.stderr, /epic #197 is closed/);
  });

  test("an epic with no Sub-issues exits 1 with the fix: run /to-tickets 197", async () => {
    const r = await assertCase("preflight", fixture("no-sub-issues"), 1);
    assert.match(r.stderr, /run \/to-tickets 197/);
  });

  test("gh older than 2.94 exits 1 with the upgrade fix", async () => {
    const r = await assertCase("preflight", fixture("old-gh"), 1);
    assert.match(r.stderr, /2\.93\.1/);
    assert.match(r.stderr, /upgrade gh/);
  });

  test("a CLAUDE.md without the Routing block exits 1 with the fix: run /setup-spp", async () => {
    const r = await assertCase("preflight", fixture("no-routing"), 1);
    assert.match(r.stderr, /run \/setup-spp/);
  });

  test("neither CLAUDE.md nor AGENTS.md exists: the same Routing block failure", async () => {
    const r = await assertCase("preflight", fixture("no-claude-file"), 1);
    assert.match(r.stderr, /run \/setup-spp/);
  });

  test("no epic argument exits 2 with usage", async () => {
    const r = await assertCase("preflight", fixture("no-epic"), 2);
    assert.match(r.stderr, /usage: spp preflight/);
  });
});

describe("edge cases", () => {
  test("a Routing block with Panel: tickets>=6 parses tickets 6 and keeps the other thresholds", async () => {
    await assertCase("preflight", fixture("panel-tickets"));
  });

  test("Panel accepts all three thresholds in any order", () => {
    const r = parseRouting(block("- Mode: labels-only", "- Panel: lines>=500, size:L, tickets>=2"));
    assert.deepEqual(r.panel, { tickets: 2, sizeL: true, lines: 500 });
    assert.equal(r.mode, "labels-only");
  });

  test("no Panel line gives the defaults 4, size:L, 1000", () => {
    assert.deepEqual(parseRouting(block("- Mode: org")).panel, { tickets: 4, sizeL: true, lines: 1000 });
  });

  test("Sizes keeps its text and Laws splits on commas", () => {
    const r = parseRouting(block("- Mode: org", "- Sizes: `size:S/M/L` labels", "- Laws: CLAUDE.md, .agents/adr/ , GLOSSARY.md"));
    assert.equal(r.sizes, "`size:S/M/L` labels");
    assert.deepEqual(r.laws, ["CLAUDE.md", ".agents/adr/", "GLOSSARY.md"]);
  });

  test("an unknown Mode or Panel threshold is an error naming it, not a silent default", () => {
    assert.throws(() => parseRouting(block("- Mode: team")), /Mode.*team/);
    assert.throws(() => parseRouting(block("- Mode: org", "- Panel: tickes>=6")), /tickes>=6/);
  });

  test("a Merge line sets the merge method, absent leaves it unset, and an unknown one is an error", () => {
    assert.equal(parseRouting(block("- Mode: org", "- Merge: rebase")).merge, "rebase");
    assert.equal("merge" in parseRouting(block("- Mode: org")), false);
    assert.throws(() => parseRouting(block("- Mode: org", "- Merge: octopus")), /Merge.*octopus/);
  });

  test("text without the block is an error", () => {
    assert.throws(() => parseRouting("# nothing"), /Routing block/);
  });
});
