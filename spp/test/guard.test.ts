import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { git, gitRepo, runSpp, tempDir } from "./fixtures/verify/git.ts";

const here = dirname(fileURLToPath(import.meta.url));
type Case = { kind: string; name: string; cwd: "main" | "worktree" | "nested"; command: string; decision: "allow" | "deny" };
const cases = JSON.parse(readFileSync(join(here, "fixtures", "guard", "cases.json"), "utf8")) as Case[];

// <base>/main is the main checkout, <base>/wts/wt a sibling worktree, <main>/.claude/worktrees/n a nested one.
function layout(): Record<Case["cwd"], string> {
  const base = tempDir("spp-guard-");
  const main = join(base, "main");
  mkdirSync(main);
  gitRepo("main", { "README.md": "hello\n" }, main);
  git(main, "worktree", "add", "-q", "-b", "sdd/1-x", "../wts/wt");
  git(main, "worktree", "add", "-q", "-b", "sdd/2-y", ".claude/worktrees/n");
  return { main, worktree: join(base, "wts", "wt"), nested: join(main, ".claude", "worktrees", "n") };
}

const dirs = layout();
const payload = (cwd: string, command: string) =>
  JSON.stringify({ hook_event_name: "PreToolUse", cwd, tool_name: "Bash", tool_input: { command, description: "x" }, tool_use_id: "toolu_1" });

for (const kind of ["Happy path", "Error path", "Edge case"]) {
  describe(kind, () => {
    for (const c of cases.filter((c) => c.kind === kind)) {
      test(`${c.name}: ${c.decision}`, () => {
        const r = runSpp(["guard", "worktree"], payload(dirs[c.cwd], c.command.replace("{{main}}", dirs.main)), dirs[c.cwd]);
        if (c.decision === "allow") {
          assert.equal(r.code, 0, r.stderr);
          assert.equal(r.stderr, "");
        } else {
          assert.equal(r.code, 2);
          assert.match(r.stderr, /main checkout/);
        }
      });
    }
  });
}

describe("Edge case", () => {
  test("a payload from another tool is allowed", () => {
    const r = runSpp(["guard", "worktree"], JSON.stringify({ hook_event_name: "PreToolUse", cwd: dirs.worktree, tool_name: "Edit", tool_input: {} }), dirs.worktree);
    assert.equal(r.code, 0, r.stderr);
  });

  test("spp guard with an unknown guard exits 2 with usage", () => {
    const r = runSpp(["guard", "other"], "{}", dirs.worktree);
    assert.equal(r.code, 2);
    assert.match(r.stderr, /usage: spp guard/);
  });
});
