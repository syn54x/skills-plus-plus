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

const indent = (line: string) => line.length - line.trimStart().length;

// The lines under `key:` that start at `depth` or deeper: blank lines and, for a list, `- ` items at the key's own indent.
function under(lines: string[], key: RegExp, depth: number): string[] | undefined {
  const start = lines.findIndex((line) => indent(line) === depth && key.test(line.trim()));
  if (start === -1) return undefined;
  const body: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (line.trim() && indent(line) <= depth && !(indent(line) === depth && line.trim().startsWith("- "))) break;
    body.push(line);
  }
  return body;
}

// undefined when there is no `metadata.credits` key; otherwise each list entry as its raw `key: value`
// pairs, so the url's quotes survive to be checked. An empty array means the key holds no list.
// A key line may carry trailing spaces or a YAML comment.
function credits(fm: string): Map<string, string>[] | undefined {
  const metadata = under(fm.split("\n"), /^metadata:\s*(#.*)?$/, 0);
  const inner = metadata?.find((line) => line.trim());
  const list = metadata && inner && under(metadata, /^credits:(\s|$)/, indent(inner));
  if (!list) return undefined;
  const entries: Map<string, string>[] = [];
  for (const line of list) {
    const item = line.trim().match(/^-\s+(.*)$/);
    if (item) entries.push(new Map());
    const m = (item ? item[1] : line.trim()).match(/^([\w-]+):\s*(.*)$/);
    if (m && entries.length) entries[entries.length - 1].set(m[1], m[2].trim());
  }
  return entries;
}

const errors: string[] = [];
const skillsRoot = existsSync("skills") ? readdirSync("skills").sort() : [];
for (const dir of skillsRoot.map((name) => join("skills", name))) {
  const skillMd = join(dir, "SKILL.md");
  if (!existsSync(skillMd)) continue;
  const entries = credits(frontmatter(readFileSync(skillMd, "utf8").replace(/\r\n/g, "\n")));
  if (entries?.length === 0) errors.push(`${skillMd}: metadata.credits has no list entry ('- skill: ...')`);
  entries?.forEach((entry, i) => {
    for (const key of ["skill", "author", "url"])
      if (!entry.get(key)?.replace(/^(["'])(.*)\1$/, "$2").trim())
        errors.push(`${skillMd}: credits entry ${i + 1} has no '${key}'`);
    const url = entry.get("url");
    if (url && !/^(["'])\1$/.test(url) && !/^"https:\/\/[^"]+"$/.test(url))
      errors.push(`${skillMd}: credits entry ${i + 1} 'url' must be in double quotes and start with https://`);
  });
  const hasCreditsMd = existsSync(join(dir, "CREDITS.md"));
  if (entries && !hasCreditsMd) errors.push(`${dir}: has credits but no CREDITS.md`);
  if (!entries && hasCreditsMd) errors.push(`${dir}: has a CREDITS.md but no metadata.credits`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
