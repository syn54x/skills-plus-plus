// The terminal help and the generated command reference: every command answers --help, and the reference pages
// TypeDoc writes from the commands' TSDoc are all in the docs nav, fail the run when a tag is missing, and fail the
// staleness check when the TSDoc changes without a regeneration.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { test } from "node:test";
import { runCase } from "../../spp/test/harness.ts";
import { repoRoot } from "./fixtures/tree.ts";

const commands = readdirSync(join(repoRoot, "spp/src/commands")).filter((f) => f.endsWith(".ts")).map((f) => f.slice(0, -3));
const spp = (...args: string[]) => spawnSync(process.execPath, [join(repoRoot, "bin/spp"), ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const sh = (command: string, cwd: string) => spawnSync("sh", ["-c", command], { cwd, encoding: "utf8" });

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

test("-h as a note's text is recorded, not taken for help", async () => {
  const dir = mkdtempSync(join(tmpdir(), "spp-help-note-"));
  assert.equal(sh("git init -q && git remote add origin https://github.com/acme/api.git", dir).status, 0);
  const state = mkdtempSync(join(tmpdir(), "spp-help-state-"));
  writeFileSync(join(dir, "args"), "265\n-h\n");
  const before = process.env.XDG_STATE_HOME;
  process.env.XDG_STATE_HOME = state;
  try {
    const r = await runCase("note", dir);
    assert.equal(r.code, 0, r.stderr);
    assert.doesNotMatch(r.stdout, /^usage:/);
    const note = JSON.parse(readFileSync(join(state, "spp", "acme__api.jsonl"), "utf8").trim());
    assert.equal(note.ticket, 265);
    assert.equal(note.text, "-h");
  } finally {
    if (before === undefined) delete process.env.XDG_STATE_HOME;
    else process.env.XDG_STATE_HOME = before;
  }
});

test("--help as a hand-back reason is recorded, not taken for help", async () => {
  const dir = mkdtempSync(join(tmpdir(), "spp-help-hand-back-"));
  cpSync(join(repoRoot, "spp/test/fixtures/markers/ported/hand-back-needs-info"), dir, { recursive: true });
  writeFileSync(join(dir, "args"), "103\nneeds-info\n--reason\n--help\n");
  const r = await runCase("hand-back", dir);
  assert.equal(r.code, 0, r.stderr);
  assert.doesNotMatch(r.stdout, /^usage:/);
  assert.match(JSON.stringify(r.writes[0]), /Handed back:\*\* needs-info: --help/);
  assert.deepEqual(r.writes.slice(1), [
    { cmd: "gh", argv: ["issue", "edit", "103", "--add-label", "needs-info", "--remove-label", "ready-for-agent"] },
    { cmd: "gh", argv: ["issue", "edit", "103", "--remove-label", "claimed"] },
  ]);
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

// A throwaway copy of what TypeDoc reads, with the committed reference pages, so a test can edit the TSDoc freely.
function typedocCopy(): string {
  const copy = mkdtempSync(join(tmpdir(), "spp-typedoc-"));
  for (const p of ["spp/src", "scripts/typedoc-command-tags.ts", "typedoc.json", "tsconfig.json", "package.json", "docs/reference"]) cpSync(join(repoRoot, p), join(copy, p), { recursive: true });
  symlinkSync(join(repoRoot, "node_modules"), join(copy, "node_modules"));
  return copy;
}

test("TypeDoc fails when a command's run loses its @returns tag", () => {
  const copy = typedocCopy();
  const file = join(copy, "spp/src/commands/status.ts");
  const text = readFileSync(file, "utf8");
  assert.match(text, /@returns/);
  writeFileSync(file, text.replace(/^\s*\* @returns.*\n/m, ""));
  const r = spawnSync(process.execPath, [join(repoRoot, "node_modules/typedoc/bin/typedoc"), "--out", join(copy, "out")], { cwd: copy, encoding: "utf8" });
  assert.notEqual(r.status, 0);
  assert.match(r.stdout + r.stderr, /status.*@returns/);
});

test("the staleness check passes on the committed pages and fails once the TSDoc changes without a regeneration", () => {
  const check = readFileSync(join(repoRoot, "CLAUDE.md"), "utf8").split("\n").find((l) => l.startsWith("npm run docs:reference"));
  assert.ok(check, "CLAUDE.md lists no docs:reference check");
  const copy = typedocCopy();
  assert.equal(sh("git init -q && git add -A && git -c user.name=t -c user.email=t@t commit -qm base", copy).status, 0);
  const fresh = sh(check, copy);
  assert.equal(fresh.status, 0, fresh.stdout + fresh.stderr);
  const file = join(copy, "spp/src/commands/kind.ts");
  writeFileSync(file, readFileSync(file, "utf8").replace("says what an issue is", "tells what an issue is"));
  assert.equal(sh("git -c user.name=t -c user.email=t@t commit -qam 'edit TSDoc only'", copy).status, 0);
  const stale = sh(check, copy);
  assert.equal(stale.status, 1);
  assert.match(stale.stdout, /kind\.md/);
});
