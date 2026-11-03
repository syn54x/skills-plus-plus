#!/usr/bin/env node
// Enforces ADR 0010's credits, run from the repo root. Usage: node scripts/check-credits.ts
// 1. Every `metadata.credits` entry in a SKILL.md gives `skill`, `author` and a `url`
//    in double quotes that starts with https://.
// 2. A skill with credits has a CREDITS.md beside its SKILL.md, and one without has none.
// Exits 1 with one line per violation.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

function frontmatter(text: string): string {
  if (!text.startsWith("---\n")) return "";
  const end = text.indexOf("\n---", 4);
  return text.slice(4, end === -1 ? undefined : end);
}

// Each entry as its raw `key: value` pairs, so the url's quotes survive to be checked.
function credits(fm: string): Map<string, string>[] {
  const block = fm.match(/^metadata:\n((?:[ \t]+.*\n?)*)/m)?.[1] ?? "";
  const list = block.match(/^([ \t]+)credits:\n((?:\1[ \t]+.*\n?)*)/m)?.[2] ?? "";
  return list
    .split(/^[ \t]+- /m)
    .slice(1)
    .map((entry) => new Map(entry.split("\n").flatMap((line) => {
      const m = line.trim().match(/^([\w-]+):\s*(.*)$/);
      return m ? [[m[1], m[2]] as [string, string]] : [];
    })));
}

const errors: string[] = [];
const skillsRoot = existsSync("skills") ? readdirSync("skills").sort() : [];
for (const dir of skillsRoot.map((name) => join("skills", name))) {
  const skillMd = join(dir, "SKILL.md");
  if (!existsSync(skillMd)) continue;
  const entries = credits(frontmatter(readFileSync(skillMd, "utf8")));
  entries.forEach((entry, i) => {
    for (const key of ["skill", "author", "url"])
      if (!entry.get(key)) errors.push(`${skillMd}: credits entry ${i + 1} has no '${key}'`);
    const url = entry.get("url");
    if (url && !/^"https:\/\/[^"]+"$/.test(url))
      errors.push(`${skillMd}: credits entry ${i + 1} 'url' must be in double quotes and start with https://`);
  });
  const hasCreditsMd = existsSync(join(dir, "CREDITS.md"));
  if (entries.length && !hasCreditsMd) errors.push(`${dir}: has credits but no CREDITS.md`);
  if (!entries.length && hasCreditsMd) errors.push(`${dir}: has a CREDITS.md but no metadata.credits`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
