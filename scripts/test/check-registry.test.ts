import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { repoRoot, run } from "./fixtures/tree.ts";

const fixture = join(repoRoot, "scripts", "test", "fixtures", "registry");

// A copy of the registry fixture, with `edit` applied to the named files (each gets its text, returns the new text).
function registry(edits: Record<string, (text: string) => string> = {}): string {
  const root = mkdtempSync(join(tmpdir(), "spp-registry-"));
  cpSync(fixture, root, { recursive: true });
  for (const [path, edit] of Object.entries(edits)) writeFileSync(join(root, path), edit(readFileSync(join(root, path), "utf8")));
  return root;
}

const without = (line: string) => (text: string) => text.split("\n").filter((l) => !l.includes(line)).join("\n");

test("the fixture registry passes and prints nothing", () => {
  const result = run("check-registry.ts", registry());
  assert.equal(result.stderr, "");
  assert.equal(result.status, 0);
});

test("the finished tree passes", () => {
  const result = run("check-registry.ts", repoRoot);
  assert.equal(result.stderr, "");
  assert.equal(result.status, 0);
});

test("a skill folder missing from the README fails, naming it", () => {
  const result = run("check-registry.ts", registry({ "README.md": without("[alpha]") }));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /README\.md: .*\balpha\b/);
  assert.equal(result.stderr.trim().split("\n").length, 1);
});

test("a README naming a skill with no folder fails, naming it", () => {
  const result = run("check-registry.ts", registry({ "README.md": (t) => t + "- [gamma](./skills/gamma/SKILL.md): gone.\n" }));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /README\.md: .*\bgamma\b/);
});

test("a skill without a docs page fails, naming it", () => {
  const root = registry();
  rmSync(join(root, "docs", "skills", "alpha.md"));
  const result = run("check-registry.ts", root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /docs\/skills\/alpha\.md/);
});

test("an ask-spp map that omits a skill fails, naming it", () => {
  const result = run("check-registry.ts", registry({ "skills/ask-spp/SKILL.md": without("`/alpha") }));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /skills\/ask-spp\/SKILL\.md: .*\balpha\b/);
  assert.equal(result.stderr.trim().split("\n").length, 1);
});

test("an ask-spp map that names a skill with no folder fails, naming it", () => {
  const result = run("check-registry.ts", registry({ "skills/ask-spp/SKILL.md": (t) => t.replace("| `/alpha` |", "| `/alpha`, `/gamma` |") }));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /skills\/ask-spp\/SKILL\.md: .*\bgamma\b/);
});

test("an ask-spp five-paths section that names a skill with no folder fails, naming it", () => {
  const result = run("check-registry.ts", registry({ "skills/ask-spp/SKILL.md": (t) => t.replace("`/alpha <N>`", "`/gamma <N>`") }));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /skills\/ask-spp\/SKILL\.md: .*\bgamma\b/);
  assert.equal(result.stderr.trim().split("\n").length, 1);
});

test("an ask-spp Skill tool target with no folder fails, naming it", () => {
  const result = run("check-registry.ts", registry({ "skills/ask-spp/SKILL.md": (t) => t + '\nCall the Skill tool with "gamma".\n' }));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /skills\/ask-spp\/SKILL\.md: .*\bgamma\b/);
});

test("an ask-spp naming a slash command that is not a skill fails unless allowlisted", () => {
  const result = run("check-registry.ts", registry({ "skills/ask-spp/SKILL.md": (t) => t + "\nThen `/compact`.\n" }));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /skills\/ask-spp\/SKILL\.md: .*\bcompact\b/);
});

test("a skill missing from the nav fails, naming it", () => {
  const result = run("check-registry.ts", registry({ "zensical.toml": without('"skills/alpha.md"') }));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /zensical\.toml: .*\balpha\b/);
});

test("a nav entry for a skill with no folder fails, naming it", () => {
  const result = run("check-registry.ts", registry({ "zensical.toml": (t) => t.replace("  ] },", '    { "gamma" = "skills/gamma.md" },\n  ] },') }));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /zensical\.toml: .*\bgamma\b/);
});

test("a nav entry for an archived page passes", () => {
  const root = registry({ "zensical.toml": (t) => t.replace("  ] },", '    { "gamma" = "skills/gamma.md" },\n  ] },') });
  writeFileSync(join(root, "docs", "skills", "gamma.md"), "> **Archived.** Removed in 2.1.0.\n");
  const result = run("check-registry.ts", root);
  assert.equal(result.stderr, "");
  assert.equal(result.status, 0);
});

test("a nav entry not labelled with the skill name fails", () => {
  const result = run("check-registry.ts", registry({ "zensical.toml": (t) => t.replace('{ "alpha" =', '{ "Alpha" =') }));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /zensical\.toml: .*"Alpha".*alpha/);
});
