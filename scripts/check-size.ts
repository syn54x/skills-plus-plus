#!/usr/bin/env node
// Size budget for skills, so nothing is cut off when Claude Code re-attaches a skill after compaction.
// Usage: node scripts/check-size.ts [path...]   (paths are relative to the current directory; default skills)
// Fails, one line per violation, on a SKILL.md over 12 KB, a frontmatter description over 1,024
// characters, or any other .md file over 20 KB. A path that does not exist is skipped.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";

const SKILL_LIMIT = 12 * 1024;
const REFERENCE_LIMIT = 20 * 1024;
const DESCRIPTION_LIMIT = 1024;

function markdownFiles(path: string): string[] {
  if (!existsSync(path)) return [];
  if (!statSync(path).isDirectory()) return path.endsWith(".md") ? [path] : [];
  return readdirSync(path)
    .sort()
    .flatMap((entry) => markdownFiles(join(path, entry)));
}

// The frontmatter description as YAML reads it: a plain or quoted scalar, or a folded or literal block.
function description(text: string): string {
  if (!text.startsWith("---\n")) return "";
  const end = text.indexOf("\n---", 4);
  const lines = text.slice(4, end === -1 ? undefined : end).split("\n");
  const at = lines.findIndex((line) => /^description:/.test(line));
  if (at === -1) return "";
  const value = lines[at].slice("description:".length).trim();
  if (!/^[>|]/.test(value)) return value.replace(/^(["'])(.*)\1$/, "$2");
  const block: string[] = [];
  for (const line of lines.slice(at + 1)) {
    if (line.trim() !== "" && !/^\s/.test(line)) break;
    block.push(line.trim());
  }
  return block.join(value.startsWith(">") ? " " : "\n").trim();
}

const paths = process.argv.slice(2);
const errors: string[] = [];

for (const file of (paths.length ? paths : ["skills"]).flatMap(markdownFiles)) {
  const text = readFileSync(file, "utf8");
  const bytes = Buffer.byteLength(text);
  if (basename(file) === "SKILL.md") {
    if (bytes > SKILL_LIMIT) errors.push(`${file}: ${bytes} bytes, over the 12 KB limit for a SKILL.md`);
    const length = [...description(text)].length;
    if (length > DESCRIPTION_LIMIT)
      errors.push(`${file}: description is ${length} characters, over the 1,024 limit`);
  } else if (bytes > REFERENCE_LIMIT) {
    errors.push(`${file}: ${bytes} bytes, over the 20 KB limit for a reference file`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
