#!/usr/bin/env node
// Enforces .agents/invocation.md, run from the repo root. Usage: node scripts/check-invocation.ts
// 1. A skill's `disable-model-invocation: true` and its agents/openai.yaml
//    `allow_implicit_invocation: false` agree, and every skill has that file.
// 2. Frontmatter values carry no unquoted ': ' or ' #' (invalid YAML that some hosts drop silently), in skills,
//    agents and eval prompts: `claude plugin eval` skips a case whose prompt.md frontmatter does not parse.
// 3. Every skill another skill or agent calls (`Call the Skill tool with "x"`, or an agent's
//    `skills:` preload) exists and is model-invoked, unless it is a friend named in
//    .agents/invocation.md's Friends section (a skill another plugin ships).
// Exits 1 with one line per violation.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const CALL = /[Cc]all the Skill tool (?:with|twice, for|for) ((?:["`][\w-]+["`](?:,? and |, )?)+)/g;
const NAME = /["`]([\w-]+)["`]/g;

function frontmatter(text: string): string {
  if (!text.startsWith("---\n")) return "";
  const end = text.indexOf("\n---", 4);
  return text.slice(4, end === -1 ? undefined : end);
}

function field(fm: string, key: string): string | undefined {
  return fm.match(new RegExp(`^${key}:\\s*(.+)$`, "m"))?.[1].trim().replace(/^"(.*)"$/, "$1");
}

function yamlColonErrors(file: string, fm: string): string[] {
  return fm.split("\n").flatMap((line) => {
    const m = line.match(/^([\w-]+):\s+(.*)$/);
    const quoted = m && "\"'>|[".includes(m[2][0]);
    return m && !quoted && (m[2].includes(": ") || m[2].includes(" #"))
      ? [`${file}: frontmatter '${m[1]}' has an unquoted ': ' or ' #' (invalid YAML); quote it or rephrase`]
      : [];
  });
}

function filesUnder(dir: string, suffix: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .sort()
    .flatMap((entry) => {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) return filesUnder(path, suffix);
      return path.endsWith(suffix) ? [path] : [];
    });
}

function friends(): Set<string> {
  const law = ".agents/invocation.md";
  if (!existsSync(law)) return new Set();
  const section = readFileSync(law, "utf8").split(/^## Friends$/m)[1]?.split(/^## /m)[0] ?? "";
  return new Set([...section.matchAll(/^- `([\w-]+)`/gm)].map((m) => m[1]));
}

const errors: string[] = [];
const userInvoked = new Map<string, boolean>();
const skillDirs: string[] = [];

const skillsRoot = existsSync("skills") ? readdirSync("skills").sort() : [];
for (const dir of skillsRoot.map((name) => join("skills", name))) {
  const skillMd = join(dir, "SKILL.md");
  if (!existsSync(skillMd)) continue;
  const fm = frontmatter(readFileSync(skillMd, "utf8"));
  errors.push(...yamlColonErrors(skillMd, fm));
  const name = field(fm, "name");
  if (name !== dir.slice("skills/".length)) {
    errors.push(`${skillMd}: name '${name}' does not match its directory`);
    continue;
  }
  const user = field(fm, "disable-model-invocation") === "true";
  userInvoked.set(name, user);
  skillDirs.push(dir);

  const yaml = join(dir, "agents", "openai.yaml");
  if (!existsSync(yaml)) {
    errors.push(`${skillMd}: missing agents/openai.yaml`);
    continue;
  }
  const implicitOff = /allow_implicit_invocation:\s*false/.test(readFileSync(yaml, "utf8"));
  if (user !== implicitOff)
    errors.push(
      `${skillMd}: disable-model-invocation=${user} but openai.yaml allow_implicit_invocation=` +
        (implicitOff ? "false" : "true or unset"),
    );
}

const allowed = friends();
function checkTarget(where: string, target: string) {
  if (allowed.has(target)) return;
  if (!userInvoked.has(target)) errors.push(`${where}: calls unknown skill '${target}'`);
  else if (userInvoked.get(target))
    errors.push(`${where}: calls '${target}', which is user-invoked; tell the user to run /${target} instead`);
}

const agents = filesUnder("agents", ".md");
for (const file of [...skillDirs.flatMap((dir) => filesUnder(dir, ".md")), ...agents]) {
  const text = readFileSync(file, "utf8");
  text.split("\n").forEach((line, i) => {
    for (const call of line.matchAll(CALL))
      for (const [, target] of call[1].matchAll(NAME)) checkTarget(`${file}:${i + 1}`, target);
  });
  if (!agents.includes(file)) continue;
  const fm = frontmatter(text);
  errors.push(...yamlColonErrors(file, fm));
  const preload = fm.match(/^skills:\n((?:\s+-\s*.+\n?)+)/m)?.[1] ?? "";
  for (const [, target] of preload.matchAll(/-\s*([\w-]+)/g)) checkTarget(`${file} (skills: preload)`, target);
}

for (const file of filesUnder("evals", "prompt.md")) errors.push(...yamlColonErrors(file, frontmatter(readFileSync(file, "utf8"))));

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
