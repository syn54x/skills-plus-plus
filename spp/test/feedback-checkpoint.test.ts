import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, test } from "node:test";
import { CHECKPOINT_STEPS } from "../src/commands/feedback.ts";
import { fingerprint, signalsFile, type Signal } from "../src/signals.ts";
import { runCase } from "./harness.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ROUTING = (mode: string) => `# x\n\n<!-- sdd-routing -->\n- Mode: org\n- Self-improvement mode: ${mode}\n<!-- /sdd-routing -->\n`;
const FP1 = fingerprint("harden", "3", "step-unclear");
const FP2 = fingerprint("implement-issue", "fix", "fix-round");

type Checkout = { dir: string; state: string; config: string };

// A git checkout on `main` whose origin is acme/app (unless `origin` is false), with a Routing block holding `mode`.
function checkout(mode = "Anonymous", origin = true): Checkout {
  const dir = mkdtempSync(join(tmpdir(), "spp-checkpoint-"));
  spawnSync("git", ["init", "-q", "-b", "main"], { cwd: dir });
  if (origin) spawnSync("git", ["remote", "add", "origin", "https://github.com/acme/app.git"], { cwd: dir });
  writeFileSync(join(dir, "CLAUDE.md"), ROUTING(mode));
  return { dir, state: mkdtempSync(join(tmpdir(), "spp-state-")), config: mkdtempSync(join(tmpdir(), "spp-config-")) };
}

function signal(c: Checkout, skill: string, step: string, category: Signal["category"]): void {
  const line = { at: "2026-01-01T00:00:00.000Z", repo: "acme/app", category, skill, step, version: "2.3.0", evidence: "e", fingerprint: fingerprint(skill, step, category) };
  const file = signalsFile({ XDG_STATE_HOME: c.state, HOME: c.dir }, "acme/app");
  mkdirSync(dirname(file), { recursive: true });
  appendFileSync(file, JSON.stringify(line) + "\n");
}

// Two Signals of FP1 and one of FP2.
function seeded(mode = "Anonymous"): Checkout {
  const c = checkout(mode);
  signal(c, "harden", "3", "step-unclear");
  signal(c, "harden", "3", "step-unclear");
  signal(c, "implement-issue", "fix", "fix-round");
  return c;
}

// Runs `spp feedback <args>` in an Attended session with CI unset; `env` overrides or (undefined) deletes variables.
async function feedback(c: Checkout, args: string[], env: Record<string, string | undefined> = {}) {
  writeFileSync(join(c.dir, "args"), args.join("\n") + "\n");
  writeFileSync(join(c.dir, "gh.json"), "{}");
  const saved = { ...process.env };
  Object.assign(process.env, { XDG_STATE_HOME: c.state, XDG_CONFIG_HOME: c.config, CLAUDE_CODE_SESSION_ATTENDED: "1" });
  delete process.env.CI;
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    return await runCase("feedback", c.dir);
  } finally {
    process.env = saved;
  }
}

const silent = (r: { code: number; stdout: string; stderr: string }) => {
  assert.equal(r.code, 0, r.stderr);
  assert.equal(r.stdout, "");
};

describe("happy path", () => {
  test("two pending candidates: the header, the pending lines, a blank line and the steps", async () => {
    const c = seeded();
    const pending = await feedback(c, ["pending"]);
    const r = await feedback(c, ["checkpoint"]);
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stdout, `spp: 2 Skill feedback candidates pending for acme/app:\n${pending.stdout}\n${CHECKPOINT_STEPS}`);
    assert.equal(pending.stdout.split("\n").filter(Boolean).length, 2);
  });

  test("after a skip, only the other candidate is offered", async () => {
    const c = seeded();
    assert.equal((await feedback(c, ["skip", FP1])).code, 0);
    const r = await feedback(c, ["checkpoint"]);
    assert.equal(r.code, 0, r.stderr);
    const [head, line, blank] = r.stdout.split("\n");
    assert.equal(head, "spp: 1 Skill feedback candidates pending for acme/app:");
    assert.equal(line, `${FP2} 1 implement-issue fix fix-round`);
    assert.equal(blank, "");
  });
});

describe("edge cases: nothing printed, exit 0", () => {
  test("CI=true", async () => silent(await feedback(seeded(), ["checkpoint"], { CI: "true" })));
  test("CLAUDE_CODE_SESSION_ATTENDED unset", async () => silent(await feedback(seeded(), ["checkpoint"], { CLAUDE_CODE_SESSION_ATTENDED: undefined })));
  test("Self-improvement mode Off", async () => silent(await feedback(seeded("Off"), ["checkpoint"])));
  test("a worker's sdd/ branch", async () => {
    const c = seeded();
    spawnSync("git", ["checkout", "-q", "-b", "sdd/12-add-export"], { cwd: c.dir });
    silent(await feedback(c, ["checkpoint"]));
  });
  test("a desktop driver's sdd-<N> branch (F21: the one worker check)", async () => {
    const c = seeded();
    spawnSync("git", ["checkout", "-q", "-b", "sdd-12"], { cwd: c.dir });
    silent(await feedback(c, ["checkpoint"]));
  });
  test("an empty Signal log", async () => silent(await feedback(checkout(), ["checkpoint"])));
});

describe("error paths", () => {
  test("no origin remote: one line on stderr, still exit 0", async () => {
    const r = await feedback(checkout("Anonymous", false), ["checkpoint"]);
    silent(r);
    const lines = r.stderr.split("\n").filter(Boolean);
    assert.equal(lines.length, 1);
    assert.match(lines[0], /^spp feedback checkpoint: /);
  });

  test("an extra argument is a usage error", async () => {
    const r = await feedback(seeded(), ["checkpoint", "extra"]);
    assert.equal(r.code, 1);
    assert.match(r.stderr, /usage: spp feedback/);
    assert.match(r.stderr, /spp feedback checkpoint\n/);
  });
});

describe("integration", () => {
  test("hooks.json runs the checkpoint on SessionStart startup only", () => {
    const hooks = JSON.parse(readFileSync(join(root, "hooks", "hooks.json"), "utf8")) as { hooks: Record<string, { matcher?: string; hooks: { command: string }[] }[]> };
    const groups = hooks.hooks.SessionStart;
    assert.equal(groups.length, 1);
    assert.equal(groups[0].matcher, "startup");
    assert.deepEqual(groups[0].hooks.map((h) => h.command), ['"${CLAUDE_PLUGIN_ROOT}/bin/spp" feedback checkpoint']);
  });
});
