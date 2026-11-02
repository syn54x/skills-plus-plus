// The terminal help and the generated command reference: every command answers --help, and the reference pages
// TypeDoc writes from the commands' TSDoc are all in the docs nav and fail the run when a tag is missing.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { test } from "node:test";
import { repoRoot } from "./fixtures/tree.ts";

const commands = readdirSync(join(repoRoot, "spp/src/commands")).filter((f) => f.endsWith(".ts")).map((f) => f.slice(0, -3));
const spp = (...args: string[]) => spawnSync(process.execPath, [join(repoRoot, "bin/spp"), ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

test("every command prints its usage on stdout and exits 0 for --help and -h", () => {
  assert.ok(commands.includes("status"));
  for (const command of commands) {
    for (const flag of ["--help", "-h"]) {
      const r = spp(command, flag);
      assert.equal(r.status, 0, `spp ${command} ${flag}: ${r.stderr}`);
      assert.equal(r.stderr, "", `spp ${command} ${flag}`);
      assert.match(r.stdout, new RegExp(`^usage: spp ${command}\\b`), `spp ${command} ${flag}`);
    }
  }
});

test("--help after a subcommand or an argument still prints the usage", () => {
  for (const args of [["lint", "ticket", "--help"], ["wave", "plan", "-h"], ["status", "12", "--help"]]) {
    const r = spp(...args);
    assert.equal(r.status, 0, `spp ${args.join(" ")}: ${r.stderr}`);
    assert.match(r.stdout, new RegExp(`^usage: spp ${args[0]}\\b`));
  }
});

const reference = join(repoRoot, "docs/reference/spp");
const pages = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? pages(join(dir, e.name)) : e.name.endsWith(".md") ? [join(dir, e.name)] : []));

test("every generated reference page is in the docs nav, and every command has one", () => {
  const nav = readFileSync(join(repoRoot, "zensical.toml"), "utf8");
  const found = pages(reference).map((p) => relative(join(repoRoot, "docs"), p));
  for (const page of found) assert.ok(nav.includes(`"${page}"`), `zensical.toml: no nav entry for ${page}`);
  for (const command of commands) assert.ok(found.includes(`reference/spp/${command}.md`), `no reference page for ${command}`);
});

test("TypeDoc fails when a command's run loses its @returns tag", () => {
  const copy = mkdtempSync(join(tmpdir(), "spp-typedoc-"));
  for (const p of ["spp/src", "scripts/typedoc-command-tags.ts", "typedoc.json", "tsconfig.json", "package.json"]) cpSync(join(repoRoot, p), join(copy, p), { recursive: true });
  symlinkSync(join(repoRoot, "node_modules"), join(copy, "node_modules"));
  const file = join(copy, "spp/src/commands/status.ts");
  const text = readFileSync(file, "utf8");
  assert.match(text, /@returns/);
  writeFileSync(file, text.replace(/^\s*\* @returns.*\n/m, ""));
  const r = spawnSync(process.execPath, [join(repoRoot, "node_modules/typedoc/bin/typedoc"), "--out", join(copy, "out")], { cwd: copy, encoding: "utf8" });
  assert.notEqual(r.status, 0);
  assert.match(r.stdout + r.stderr, /status.*@returns/);
});
