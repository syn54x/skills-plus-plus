import assert from "node:assert/strict";
import { test } from "node:test";
import { run, tree } from "./fixtures/tree.ts";

const skill = (description: string, bodyBytes: number) =>
  `---\nname: demo\ndescription: ${description}\n---\n\n${"x".repeat(bodyBytes)}\n`;

test("a 4 KB SKILL.md passes and prints nothing", () => {
  const root = tree({ "skills/demo/SKILL.md": skill("Short.", 4 * 1024) });
  const result = run("check-size.ts", root);
  assert.equal(result.status, 0);
  assert.equal(result.stdout + result.stderr, "");
});

test("a 13 KB SKILL.md fails, naming the file and the 12 KB limit", () => {
  const root = tree({ "skills/demo/SKILL.md": skill("Short.", 13 * 1024) });
  const result = run("check-size.ts", root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /skills\/demo\/SKILL\.md.*12 KB/);
  assert.equal(result.stderr.trim().split("\n").length, 1);
});

test("a 1,100 character description fails, naming the file and the 1,024 limit", () => {
  const root = tree({ "skills/demo/SKILL.md": skill("d".repeat(1100), 100) });
  const result = run("check-size.ts", root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /skills\/demo\/SKILL\.md.*1,024/);
});

test("a folded multi-line description is measured whole", () => {
  const folded = `>\n  ${"d".repeat(600)}\n  ${"e".repeat(600)}`;
  const root = tree({ "skills/demo/SKILL.md": skill(folded, 100) });
  const result = run("check-size.ts", root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /1,024/);
});

test("a 21 KB reference file fails, naming the file and the 20 KB limit", () => {
  const root = tree({
    "skills/demo/SKILL.md": skill("Short.", 100),
    "skills/demo/REFERENCE.md": "x".repeat(21 * 1024),
  });
  const result = run("check-size.ts", root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /skills\/demo\/REFERENCE\.md.*20 KB/);
});

test("explicit paths are checked instead of skills/", () => {
  const root = tree({ "elsewhere/demo/SKILL.md": skill("Short.", 13 * 1024) });
  assert.equal(run("check-size.ts", root).status, 0);
  const result = run("check-size.ts", root, ["elsewhere"]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /elsewhere\/demo\/SKILL\.md/);
});

test("a repo with no skills/ yet passes", () => {
  const root = tree({ "README.md": "empty" });
  assert.equal(run("check-size.ts", root).status, 0);
});
