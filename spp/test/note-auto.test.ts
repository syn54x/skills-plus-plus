import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { git, gitRepo, runSpp, tempDir } from "./fixtures/verify/git.ts";

const here = dirname(fileURLToPath(import.meta.url));
type Entry = { repo: string; ticket: number; text: string; milestone: boolean };

// A hook payload from fixtures/note-auto, its cwd the repo, with `change` applied.
function payload(name: string, cwd: string, change: (p: Record<string, any>) => void = () => {}): string {
  const p = JSON.parse(readFileSync(join(here, "fixtures", "note-auto", `${name}.json`), "utf8").replace("{{cwd}}", cwd));
  change(p);
  return JSON.stringify(p);
}

// Runs `spp note --auto` from a directory other than the repo, so the payload's cwd is what counts.
function auto(input: string): { code: number; stderr: string; log: Entry[] } {
  const state = tempDir("spp-state-");
  const r = runSpp(["note", "--auto"], input, tempDir("spp-elsewhere-"), { XDG_STATE_HOME: state });
  const file = join(state, "spp", "acme__app.jsonl");
  const log = existsSync(file) ? readFileSync(file, "utf8").trim().split("\n").map((l) => JSON.parse(l) as Entry) : [];
  return { code: r.code, stderr: r.stderr, log };
}

const texts = (r: { log: Entry[] }) => r.log.map((e) => [e.ticket, e.text]);

describe("happy path", () => {
  test("a successful gh pr create returning a URL gives one note PR open <url>", () => {
    const r = auto(payload("pr-create", gitRepo("sdd/12-x")));
    assert.equal(r.code, 0, r.stderr);
    assert.deepEqual(texts(r), [[12, "PR open https://github.com/acme/app/pull/57"]]);
    assert.equal(r.log[0].repo, "acme/app");
  });

  test("a spp verify run gives Verify passed with the verified commit", () => {
    const repo = gitRepo("sdd/12-x");
    git(repo, "notes", "--ref=sdd-verify", "add", "-m", "verified 2026-11-01T00:00:00Z", "HEAD");
    const r = auto(payload("verify", repo));
    assert.equal(r.code, 0, r.stderr);
    assert.deepEqual(texts(r), [[12, `Verify passed ${git(repo, "rev-parse", "--short=7", "HEAD")}`]]);
  });

  test("a failed spp verify run, reported as a tool failure, gives Verify failed", () => {
    const repo = gitRepo("sdd/12-x");
    git(repo, "notes", "--ref=sdd-verify", "add", "-m", "failed 2026-11-01T00:00:00Z", "HEAD");
    const r = auto(payload("verify", repo, (p) => {
      p.hook_event_name = "PostToolUseFailure";
      delete p.tool_response;
      p.error = "Exit code 1";
    }));
    assert.deepEqual(texts(r), [[12, `Verify failed ${git(repo, "rev-parse", "--short=7", "HEAD")}`]]);
  });

  test("a stop gives one note stopped", () => {
    const r = auto(payload("stop", gitRepo("sdd/12-x")));
    assert.equal(r.code, 0, r.stderr);
    assert.deepEqual(texts(r), [[12, "stopped"]]);
  });
});

describe("edge cases", () => {
  test("any other Bash command gives no note", () => {
    const r = auto(payload("pr-create", gitRepo("sdd/12-x"), (p) => (p.tool_input.command = "npm test")));
    assert.equal(r.code, 0, r.stderr);
    assert.deepEqual(r.log, []);
  });

  test("gh pr create that printed no pull request URL gives no note", () => {
    const r = auto(payload("pr-create", gitRepo("sdd/12-x"), (p) => (p.tool_response.stdout = "")));
    assert.deepEqual(r.log, []);
  });

  test("spp verify --check is not a Verify run", () => {
    const repo = gitRepo("sdd/12-x");
    git(repo, "notes", "--ref=sdd-verify", "add", "-m", "verified x", "HEAD");
    const r = auto(payload("verify", repo, (p) => (p.tool_input.command = "spp verify --check")));
    assert.deepEqual(r.log, []);
  });

  test("off an sdd/* branch there is no ticket, so no note", () => {
    const r = auto(payload("pr-create", gitRepo("main")));
    assert.equal(r.code, 0, r.stderr);
    assert.deepEqual(r.log, []);
  });

  test("an empty payload exits 0 with no note", () => {
    const r = auto("");
    assert.equal(r.code, 0, r.stderr);
    assert.deepEqual(r.log, []);
  });
});

describe("integration", () => {
  test("hooks/hooks.json wires verify --check, the guard and the auto note through the plugin's bin/spp", () => {
    const hooks = JSON.parse(readFileSync(join(here, "..", "..", "hooks", "hooks.json"), "utf8")).hooks;
    const commands = (event: string, matcher?: string) =>
      hooks[event].filter((g: { matcher?: string }) => g.matcher === matcher).flatMap((g: { hooks: { command: string }[] }) => g.hooks.map((h) => h.command));
    const spp = (args: string) => `"\${CLAUDE_PLUGIN_ROOT}/bin/spp" ${args}`;
    assert.deepEqual(commands("Stop"), [spp("verify --check"), spp("note --auto")]);
    assert.deepEqual(commands("SubagentStop"), [spp("verify --check")]);
    assert.deepEqual(commands("PreToolUse", "Bash"), [spp("guard worktree")]);
    assert.deepEqual(commands("PostToolUse", "Bash"), [spp("note --auto")]);
    assert.deepEqual(commands("PostToolUseFailure", "Bash"), [spp("note --auto")]);
  });
});
