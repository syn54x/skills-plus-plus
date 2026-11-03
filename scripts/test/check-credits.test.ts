import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { repoRoot, run, tree } from "./fixtures/tree.ts";

const GRILL_ME = '"https://github.com/mattpocock/skills/tree/main/skills/productivity/grill-me"';

function credited(name: string, entry: string, creditsMd = true) {
  const files: Record<string, string> = {
    [`skills/${name}/SKILL.md`]: `---\nname: ${name}\ndescription: Demo skill.\nmetadata:\n  credits:\n${entry}---\n\nBody.\n`,
  };
  if (creditsMd) files[`skills/${name}/CREDITS.md`] = "# Credits\n\nThe idea came from grill-me.\n";
  return files;
}

const entry = (fields: Record<string, string>) =>
  Object.entries(fields)
    .map(([key, value], i) => `${i ? "      " : "    - "}${key}: ${value}\n`)
    .join("");

const FULL = { skill: "grill-me", author: "Matt Pocock", url: GRILL_ME };

test("a credited skill with every field and a CREDITS.md passes", () => {
  const result = run("check-credits.ts", tree(credited("demo", entry(FULL))));
  assert.equal(result.stderr, "");
  assert.equal(result.status, 0);
});

test("a skill with neither credits nor CREDITS.md passes", () => {
  const root = tree({ "skills/own/SKILL.md": "---\nname: own\ndescription: Demo skill.\n---\n\nBody.\n" });
  const result = run("check-credits.ts", root);
  assert.equal(result.stderr, "");
  assert.equal(result.status, 0);
});

test("a credits entry with no author fails, naming the skill and author", () => {
  const result = run("check-credits.ts", tree(credited("demo", entry({ skill: "grill-me", url: GRILL_ME }))));
  assert.equal(result.status, 1);
  assert.equal(result.stderr.trim().split("\n").length, 1);
  assert.match(result.stderr, /skills\/demo\/SKILL\.md.*author/);
});

test("a credits entry whose url is unquoted fails, naming the skill and url", () => {
  const unquoted = { ...FULL, url: GRILL_ME.slice(1, -1) };
  const result = run("check-credits.ts", tree(credited("demo", entry(unquoted))));
  assert.equal(result.status, 1);
  assert.equal(result.stderr.trim().split("\n").length, 1);
  assert.match(result.stderr, /skills\/demo\/SKILL\.md.*url/);
});

test("a credits entry whose url is not https fails, naming the skill and url", () => {
  const http = { ...FULL, url: GRILL_ME.replace("https", "http") };
  const result = run("check-credits.ts", tree(credited("demo", entry(http))));
  assert.equal(result.status, 1);
  assert.equal(result.stderr.trim().split("\n").length, 1);
  assert.match(result.stderr, /skills\/demo\/SKILL\.md.*url/);
});

test("a credited skill with no CREDITS.md fails, naming the skill", () => {
  const result = run("check-credits.ts", tree(credited("demo", entry(FULL), false)));
  assert.equal(result.status, 1);
  assert.equal(result.stderr.trim().split("\n").length, 1);
  assert.match(result.stderr, /skills\/demo\b.*CREDITS\.md/);
});

test("a CREDITS.md beside a SKILL.md with no credits fails, naming the skill", () => {
  const root = tree({
    "skills/own/SKILL.md": "---\nname: own\ndescription: Demo skill.\n---\n\nBody.\n",
    "skills/own/CREDITS.md": "# Credits\n",
  });
  const result = run("check-credits.ts", root);
  assert.equal(result.status, 1);
  assert.equal(result.stderr.trim().split("\n").length, 1);
  assert.match(result.stderr, /skills\/own\b.*CREDITS\.md/);
});

test("the repository passes, with grilling credited", () => {
  const result = run("check-credits.ts", repoRoot);
  assert.equal(result.stderr, "");
  assert.equal(result.status, 0);
  const grilling = readFileSync(join(repoRoot, "skills/grilling/SKILL.md"), "utf8");
  assert.match(grilling, /^  credits:\n    - skill: grilling\n      author: Matt Pocock$/m);
});
