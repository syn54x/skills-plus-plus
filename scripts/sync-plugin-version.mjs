#!/usr/bin/env node
// Copies package.json's version into every plugin manifest
// (.claude-plugin, .cursor-plugin, .codex-plugin).
// Runs as part of `npm run version`, immediately after `changeset version`.
// With --check it changes nothing and exits 1 if any manifest differs.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifests = [".claude-plugin", ".cursor-plugin", ".codex-plugin"]
  .map((dir) => join(repo, dir, "plugin.json"))
  .filter((path) => existsSync(path));

const { version } = JSON.parse(readFileSync(join(repo, "package.json"), "utf8"));
const check = process.argv.includes("--check");
let failed = false;

for (const pluginPath of manifests) {
  const label = pluginPath.slice(repo.length + 1);
  const source = readFileSync(pluginPath, "utf8");
  const plugin = JSON.parse(source);

  if (plugin.version === version) {
    console.log(`${label} version is ${version} (already in sync)`);
    continue;
  }

  if (check) {
    console.error(
      `${label} version is ${plugin.version}, package.json is ${version}. Run \`node scripts/sync-plugin-version.mjs\`.`,
    );
    failed = true;
    continue;
  }

  // Rewrite only the version line, to keep the key order and the formatting.
  const updated = source.replace(/("version"\s*:\s*")[^"]*(")/, `$1${version}$2`);

  if (JSON.parse(updated).version !== version) {
    console.error(`Could not find a version field to replace in ${label}.`);
    failed = true;
    continue;
  }

  writeFileSync(pluginPath, updated);
  console.log(`${label} version ${plugin.version} -> ${version}`);
}

process.exit(failed ? 1 : 0);
