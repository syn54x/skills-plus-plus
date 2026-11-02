#!/usr/bin/env node
// Keeps .claude-plugin/plugin.json's version equal to package.json's, run from the repo root.
// Usage: node scripts/sync-version.ts           copies the version over (runs after `changeset version`)
//        node scripts/sync-version.ts --check   changes nothing; exits 1 when the two differ
// Claude Code reinstalls a plugin only when plugin.json's version moves, so a drift ships no release.
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const PLUGIN = ".claude-plugin/plugin.json";

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

if (!existsSync(PLUGIN)) fail(`${PLUGIN} is missing`);

const { version } = JSON.parse(readFileSync("package.json", "utf8"));
const source = readFileSync(PLUGIN, "utf8");
const current = JSON.parse(source).version;

if (current !== version) {
  if (process.argv.includes("--check"))
    fail(`${PLUGIN} version is ${current}, package.json is ${version}; run node scripts/sync-version.ts`);

  // Rewrite only the version value, so key order and formatting survive.
  const updated = source.replace(/("version"\s*:\s*")[^"]*(")/, `$1${version}$2`);
  if (JSON.parse(updated).version !== version) fail(`${PLUGIN} has no version field to replace`);
  writeFileSync(PLUGIN, updated);
  console.log(`${PLUGIN} version ${current} -> ${version}`);
}
