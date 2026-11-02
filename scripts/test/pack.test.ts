import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { repoRoot } from "./fixtures/tree.ts";

const sh = (cmd: string, args: string[], cwd: string, env: NodeJS.ProcessEnv = process.env) =>
  spawnSync(cmd, args, { cwd, encoding: "utf8", env });

// npm 11 prints an array of packs, newer npm an object keyed by package name.
type Pack = { filename: string; files: { path: string }[] };
const firstPack = (stdout: string): Pack => {
  const json = JSON.parse(stdout);
  return Array.isArray(json) ? json[0] : (Object.values(json) as Pack[])[0];
};

// A throwaway copy of the package: prepack builds dist/ here, never in the repo, so `bin/spp` in the repo keeps running the sources.
function copyRepo(): string {
  const copy = mkdtempSync(join(tmpdir(), "spp-copy-"));
  for (const p of ["bin", "spp/src", "package.json", "tsconfig.json", "tsconfig.build.json", "README.md", "LICENSE"]) {
    cpSync(join(repoRoot, p), join(copy, p), { recursive: true });
  }
  symlinkSync(join(repoRoot, "node_modules"), join(copy, "node_modules"));
  return copy;
}

test("npm pack lists only bin, dist and the package files, with a dist file per command", () => {
  const result = sh("npm", ["pack", "--dry-run", "--json"], copyRepo());
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
  const pack = sh("npm", ["pack", "--json", "--pack-destination", out], copyRepo());
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

test("with spp/src beside it, bin/spp runs an edited command even when a stale dist/ is present", () => {
  const copy = copyRepo();
  const build = sh("npm", ["run", "build"], copy);
  assert.equal(build.status, 0, build.stderr);
  const status = join(copy, "spp/src/commands/status.ts");
  writeFileSync(status, readFileSync(status, "utf8").replace("usage: spp status", "edited usage: spp status"));
  const run = sh(process.execPath, ["bin/spp", "status"], copy);
  assert.equal(run.status, 2);
  assert.match(run.stderr, /^edited usage: spp status/);
});

// The release script runs under sh from package.json because changesets/action cannot parse a quoted `sh -c` line.
function release(env: NodeJS.ProcessEnv) {
  const dir = mkdtempSync(join(tmpdir(), "spp-release-"));
  cpSync(join(repoRoot, "package.json"), join(dir, "package.json"));
  const bin = join(dir, "stub");
  mkdirSync(bin);
  const log = join(dir, "calls.log");
  writeFileSync(join(bin, "changeset"), `#!/bin/sh\necho "changeset $*" >> "${log}"\n`);
  chmodSync(join(bin, "changeset"), 0o755);
  const result = sh("npm", ["run", "release"], dir, { ...process.env, ...env, PATH: `${bin}:${process.env.PATH}` });
  const calls = spawnSync("cat", [log], { encoding: "utf8" }).stdout.trim();
  return { ...result, calls };
}

test("npm run release with no NPM_TOKEN skips the publish, says so, and still tags", () => {
  const r = release({ NODE_AUTH_TOKEN: "" });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /NPM_TOKEN is not set/);
  assert.equal(r.calls, "changeset tag");
});

test("npm run release with NPM_TOKEN set publishes", () => {
  const r = release({ NODE_AUTH_TOKEN: "x" });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.calls, "changeset publish");
});
