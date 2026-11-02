import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { repoRoot, run, tree } from "./fixtures/tree.ts";

const USER = "policy:\n  allow_implicit_invocation: false\n";
const MODEL = "interface:\n  display_name: Demo\n";

function skill(name: string, opts: { user?: boolean; yaml?: string | null; body?: string } = {}) {
  const flag = opts.user ? "disable-model-invocation: true\n" : "";
  const files: Record<string, string> = {
    [`skills/${name}/SKILL.md`]: `---\nname: ${name}\ndescription: Demo skill.\n${flag}---\n\n${opts.body ?? "Body."}\n`,
  };
  const yaml = opts.yaml === undefined ? (opts.user ? USER : MODEL) : opts.yaml;
  if (yaml !== null) files[`skills/${name}/agents/openai.yaml`] = yaml;
  return files;
}

const realInvocationLaw = () => ({
  ".agents/invocation.md": readFileSync(join(repoRoot, ".agents/invocation.md"), "utf8"),
});

test("matching flags and a call to a model-invoked skill pass", () => {
  const root = tree({
    ...skill("caller", { user: true, body: 'Call the Skill tool with "helper".' }),
    ...skill("helper"),
  });
  const result = run("check-invocation.ts", root);
  assert.equal(result.stderr, "");
  assert.equal(result.status, 0);
});

test("a user-invoked skill with no openai.yaml policy fails, naming the skill", () => {
  const root = tree(skill("lonely", { user: true, yaml: MODEL }));
  const result = run("check-invocation.ts", root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /skills\/lonely\/SKILL\.md/);
  assert.match(result.stderr, /allow_implicit_invocation/);
});

test("a model-invoked skill whose openai.yaml turns implicit invocation off fails", () => {
  const root = tree(skill("muted", { yaml: USER }));
  const result = run("check-invocation.ts", root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /skills\/muted\/SKILL\.md/);
});

test("a skill with no agents/openai.yaml fails", () => {
  const root = tree(skill("bare", { yaml: null }));
  const result = run("check-invocation.ts", root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /skills\/bare\/SKILL\.md.*openai\.yaml/);
});

test("a call to a missing skill fails, naming the missing target", () => {
  const root = tree(skill("caller", { body: 'Then call the Skill tool with "missing".' }));
  const result = run("check-invocation.ts", root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /skills\/caller\/SKILL\.md:6.*'missing'/);
});

test("a call to a user-invoked skill fails", () => {
  const root = tree({
    ...skill("caller", { body: 'Call the Skill tool with "boss".' }),
    ...skill("boss", { user: true }),
  });
  const result = run("check-invocation.ts", root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /'boss'.*user-invoked/);
});

test("a call to ponytail-review passes: it is on the friends allowlist", () => {
  const root = tree({
    ...realInvocationLaw(),
    ...skill("caller", { body: 'Call the Skill tool with "ponytail-review" when it is available.' }),
  });
  const result = run("check-invocation.ts", root);
  assert.equal(result.stderr, "");
  assert.equal(result.status, 0);
});

test("two-call phrasing checks both targets", () => {
  const root = tree({
    ...skill("caller", { body: 'Call the Skill tool twice, for "helper" and "ghost".' }),
    ...skill("helper"),
  });
  const result = run("check-invocation.ts", root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /'ghost'/);
  assert.doesNotMatch(result.stderr, /'helper'/);
});

test("an agent's skills preload must name a model-invoked skill", () => {
  const root = tree({
    ...skill("boss", { user: true }),
    "agents/worker.md": "---\nname: worker\nskills:\n  - boss\n---\n\nWork.\n",
  });
  const result = run("check-invocation.ts", root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /agents\/worker\.md.*'boss'/);
});

test("a name that does not match its directory fails", () => {
  const files = skill("demo");
  files["skills/demo/SKILL.md"] = files["skills/demo/SKILL.md"].replace("name: demo", "name: other");
  const result = run("check-invocation.ts", tree(files));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /name 'other'/);
});

test("an unquoted ': ' in a frontmatter value fails", () => {
  const files = skill("demo");
  files["skills/demo/SKILL.md"] = files["skills/demo/SKILL.md"].replace("Demo skill.", "Use when: always.");
  const result = run("check-invocation.ts", tree(files));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /'description'/);
});

test("a repo with no skills/ yet passes", () => {
  assert.equal(run("check-invocation.ts", tree({ "README.md": "empty" })).status, 0);
});
