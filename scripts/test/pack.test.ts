import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { repoRoot } from "./fixtures/tree.ts";

const npm = (args: string[], cwd: string) =>
  spawnSync("npm", args, { cwd, encoding: "utf8", env: { ...process.env, npm_config_audit: "false", npm_config_fund: "false" } });

// npm 11 prints an array of packs, newer npm an object keyed by package name.
const firstPack = (stdout: string): { filename: string; files: { path: string }[] } => {
  const json = JSON.parse(stdout);
  return Array.isArray(json) ? json[0] : Object.values(json)[0];
};

test("npm pack lists only the bin, spp/src and the package files", () => {
  const result = npm(["pack", "--dry-run", "--json"], repoRoot);
  assert.equal(result.status, 0, result.stderr);
  const paths: string[] = firstPack(result.stdout).files.map((f) => f.path);
  assert.ok(paths.includes("bin/spp"));
  assert.ok(paths.some((p) => p.startsWith("spp/src/")));
  const allowed = /^(bin\/|spp\/src\/|package\.json$|README\.md$|LICENSE$)/;
  assert.deepEqual(paths.filter((p) => !allowed.test(p)), []);
});

test("the packed tarball installs into a temp folder and runs spp status --help", () => {
  const out = mkdtempSync(join(tmpdir(), "spp-pack-"));
  const pack = npm(["pack", "--json", "--pack-destination", out], repoRoot);
  assert.equal(pack.status, 0, pack.stderr);
  const tarball = join(out, firstPack(pack.stdout).filename);
  const project = mkdtempSync(join(tmpdir(), "spp-install-"));
  writeFileSync(join(project, "package.json"), "{}");
  const install = npm(["install", tarball], project);
  assert.equal(install.status, 0, install.stderr);
  const help = spawnSync("npx", ["spp", "status", "--help"], { cwd: project, encoding: "utf8" });
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout + help.stderr, /usage: spp status/);
});
