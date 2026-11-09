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

const BAD = `skill: grill-me\n      url: ${GRILL_ME}\n`;

function failsOnce(files: Record<string, string>, pattern: RegExp) {
  const result = run("check-credits.ts", tree(files));
  assert.equal(result.status, 1);
  assert.equal(result.stderr.trim().split("\n").length, 1, result.stderr);
  assert.match(result.stderr, pattern);
}

test("a list written at the same indent as credits: is still checked", () => {
  const sameIndent = `  - ${BAD.replace("      url", "    url")}`;
  failsOnce(credited("demo", sameIndent), /skills\/demo\/SKILL\.md.*'author'/);
});

test("an entry after a blank line inside the list is still checked", () => {
  failsOnce(credited("demo", `${entry(FULL)}\n    - ${BAD}`), /skills\/demo\/SKILL\.md.*entry 2.*'author'/);
});

test("a SKILL.md with CRLF line endings is still checked", () => {
  const files = credited("demo", `    - ${BAD}`);
  files["skills/demo/SKILL.md"] = files["skills/demo/SKILL.md"].replace(/\n/g, "\r\n");
  failsOnce(files, /skills\/demo\/SKILL\.md.*'author'/);
});

test("a credits: key with no entry that parses fails, naming the skill", () => {
  const map = `    skill: grill-me\n    author: Matt Pocock\n    url: ${GRILL_ME}\n`;
  failsOnce(credited("demo", map), /skills\/demo\/SKILL\.md.*credits/);
});

test("an empty quoted author counts as missing", () => {
  failsOnce(credited("demo", entry({ ...FULL, author: '""' })), /skills\/demo\/SKILL\.md.*'author'/);
});

test("a trailing comment on the metadata: and credits: lines still has the credits checked", () => {
  const files = credited("demo", `    - ${BAD}`);
  files["skills/demo/SKILL.md"] = files["skills/demo/SKILL.md"].replace(
    "metadata:\n  credits:\n",
    "metadata: # sources  \n  credits:   # one per entry\n",
  );
  failsOnce(files, /skills\/demo\/SKILL\.md.*'author'/);
});

test("an empty url is reported once, as missing", () => {
  failsOnce(credited("demo", entry({ ...FULL, url: '""' })), /skills\/demo\/SKILL\.md.*no 'url'/);
});

test("the repository passes, with grilling credited", () => {
  const result = run("check-credits.ts", repoRoot);
  assert.equal(result.stderr, "");
  assert.equal(result.status, 0);
  const grilling = readFileSync(join(repoRoot, "skills/grilling/SKILL.md"), "utf8");
  assert.match(grilling, /^  credits:\n    - skill: grilling\n      author: Matt Pocock$/m);
});

const MIT_SOURCE = { "spp/src/rules.ts": "// Patterns from gitleaks (MIT License, Copyright (c) 2019 Zachary Rice).\n" };

test("a source comment naming a copyright line missing from LICENSE fails, naming the file", () => {
  const result = run("check-credits.ts", tree({ ...MIT_SOURCE, LICENSE: "MIT License\n\nCopyright (c) 2026 Someone\n" }));
  assert.equal(result.status, 1);
  assert.equal(result.stderr.trim().split("\n").length, 1);
  assert.match(result.stderr, /spp\/src\/rules\.ts.*Copyright \(c\) 2019 Zachary Rice/);
});

test("a source comment naming a copyright line that LICENSE carries passes", () => {
  const result = run("check-credits.ts", tree({ ...MIT_SOURCE, LICENSE: "Copyright (c) 2019 Zachary Rice\n" }));
  assert.equal(result.stderr, "");
  assert.equal(result.status, 0);
});
