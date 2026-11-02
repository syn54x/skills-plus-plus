#!/usr/bin/env node
// Keeps the shared lists in step with skills/, run from the repo root. Usage: node scripts/check-registry.ts
// Every skill folder (skills/<name>/SKILL.md) must have a README.md entry linking its SKILL.md, a zensical.toml nav
// entry for docs/skills/<name>.md labelled <name>, a mention in ask-spp's SKILL.md (as `/<name>` or a Skill tool
// target), and that docs page. None of the three lists may name a skill with no folder; a nav entry for an archived page (one that
// opens with `> **Archived.**`, see .agents/writing-docs.md) is the one exception. Exits 1 with one line per violation.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => (existsSync(path) ? readFileSync(path, "utf8") : "");
const ASK = "skills/ask-spp/SKILL.md";
// Slash commands ask-spp may name that are not skills.
const NOT_SKILLS = new Set(["epic-board"]);

const skills = new Set(
  (existsSync("skills") ? readdirSync("skills") : []).filter((name) => existsSync(join("skills", name, "SKILL.md"))),
);
const errors: string[] = [];

// Each list as the skill names it holds, then both directions compared against the folders.
function compare(file: string, named: Set<string>, exempt: (name: string) => boolean = () => false) {
  for (const name of [...skills].sort()) if (!named.has(name)) errors.push(`${file}: no entry for skill ${name}`);
  for (const name of [...named].sort())
    if (!skills.has(name) && !exempt(name)) errors.push(`${file}: names skill ${name}, which has no folder under skills/`);
}

const readme = read("README.md");
compare("README.md", new Set([...readme.matchAll(/\]\((?:\.\/)?skills\/([\w-]+)\/SKILL\.md\)/g)].map((m) => m[1])));

const nav = [...read("zensical.toml").matchAll(/\{\s*"([^"]+)"\s*=\s*"skills\/([\w-]+)\.md"\s*\}/g)];
for (const [, label, name] of nav)
  if (label !== name) errors.push(`zensical.toml: nav entry for skills/${name}.md is labelled "${label}", not ${name}`);
const archived = (name: string) => read(`docs/skills/${name}.md`).startsWith("> **Archived.**");
compare("zensical.toml", new Set(nav.map((m) => m[2])), archived);

// ask-spp's map is every name in the file: a `/name` command (with or without arguments) or a Skill tool target.
if (existsSync(ASK)) {
  const text = read(ASK);
  const commands = [...text.matchAll(/`\/([a-z][\w-]*)(?=[`\s])/g)].map((m) => m[1]);
  const calls = [...text.matchAll(/Skill tool (?:with|twice, for|for) ((?:["`][\w-]+["`](?:,? and |, )?)+)/g)].flatMap((m) =>
    [...m[1].matchAll(/["`]([\w-]+)["`]/g)].map((n) => n[1]),
  );
  compare(ASK, new Set([...commands, ...calls].filter((name) => !NOT_SKILLS.has(name))));
}

for (const name of [...skills].sort())
  if (!existsSync(`docs/skills/${name}.md`)) errors.push(`docs/skills/${name}.md: missing, so skill ${name} has no docs page`);

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
