import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { repoRoot } from "./fixtures/tree.ts";

const sh = (cmd: string, args: string[], cwd: string) => spawnSync(cmd, args, { cwd, encoding: "utf8" });

// npm 11 prints an array of packs, newer npm an object keyed by package name.
const firstPack = (stdout: string): { filename: string; files: { path: string }[] } => {
  const json = JSON.parse(stdout);
  return Array.isArray(json) ? json[0] : (Object.values(json) as ReturnType<typeof firstPack>[])[0];
};

test("npm pack lists only bin, dist and the package files, with a dist file per command", () => {
  const result = sh("npm", ["pack", "--dry-run", "--json"], repoRoot);
  assert.equal(result.status, 0, result.stderr);
  const paths = firstPack(result.stdout).files.map((f) => f.path);
  const allowed = /^(bin\/|dist\/|package\.json$|README\.md$|LICENSE$)/;
  assert.deepEqual(paths.filter((p) => !allowed.test(p)), []);
  const commands = readdirSync(join(repoRoot, "spp/src/commands")).filter((f) => f.endsWith(".ts"));
  assert.ok(commands.length > 0);
  for (const f of commands) assert.ok(paths.includes(`dist/commands/${f.replace(/\.ts$/, ".js")}`), f);
});

test("the packed tarball installs into a temp folder and runs spp --help and --version", () => {
  const out = mkdtempSync(join(tmpdir(), "spp-pack-"));
  const pack = sh("npm", ["pack", "--json", "--pack-destination", out], repoRoot);
  assert.equal(pack.status, 0, pack.stderr);
  const project = mkdtempSync(join(tmpdir(), "spp-install-"));
  writeFileSync(join(project, "package.json"), "{}");
  const install = sh("npm", ["install", join(out, firstPack(pack.stdout).filename)], project);
  assert.equal(install.status, 0, install.stderr);
  const help = sh("npx", ["spp", "--help"], project);
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /^usage: spp <command>/);
  assert.match(help.stdout, /\bstatus\b/);
  // A command with no argument loads its module (the compiled one, since Node cannot strip types under node_modules) and prints its usage.
  const status = sh("npx", ["spp", "status"], project);
  assert.equal(status.status, 2, status.stderr);
  assert.match(status.stderr, /usage: spp status/);
  const { version } = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
  const ver = sh("npx", ["spp", "--version"], project);
  assert.equal(ver.status, 0, ver.stderr);
  assert.equal(ver.stdout.trim(), `spp ${version}`);
});

test("with no dist folder, node bin/spp --help runs from the .ts sources", () => {
  const copy = mkdtempSync(join(tmpdir(), "spp-src-"));
  for (const p of ["bin", "spp/src", "package.json"]) cpSync(join(repoRoot, p), join(copy, p), { recursive: true });
  const help = sh(process.execPath, ["bin/spp", "--help"], copy);
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /\bstatus\b/);
});
