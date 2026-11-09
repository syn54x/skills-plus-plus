import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { SELF_IMPROVEMENT_MODES } from "../src/routing.ts";
import { fingerprint, notCollecting, recordRun, recordSignal, type Signal, signalsFile } from "../src/signals.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const { version } = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { version: string };

// A git checkout whose origin is acme/app, with a Routing block holding `mode` (no Self-improvement line when null),
// and a state directory of its own.
function checkout(mode: string | null = "Anonymous") {
  const dir = mkdtempSync(join(tmpdir(), "spp-signal-"));
  const state = join(dir, ".state");
  spawnSync("git", ["init", "-q"], { cwd: dir });
  spawnSync("git", ["remote", "add", "origin", "https://github.com/acme/app.git"], { cwd: dir });
  const line = mode === null ? "" : `- Self-improvement mode: ${mode}\n`;
  writeFileSync(join(dir, "CLAUDE.md"), `# app\n\n<!-- sdd-routing -->\n- Mode: org\n${line}<!-- /sdd-routing -->\n`);
  const log = signalsFile({ XDG_STATE_HOME: state, HOME: dir }, "acme/app");
  return { dir, state, log };
}

// Runs bin/spp in the checkout with only the environment the test gives: CI and the attended variable never leak in
// from the runner.
function spp(c: { dir: string; state: string }, args: string[], env: Record<string, string> = { CLAUDE_CODE_SESSION_ATTENDED: "1" }) {
  const base: NodeJS.ProcessEnv = { ...process.env, XDG_STATE_HOME: c.state, HOME: c.dir };
  delete base.CI;
  delete base.CLAUDE_CODE_SESSION_ATTENDED;
  const r = spawnSync(process.execPath, [join(root, "bin", "spp"), ...args], { cwd: c.dir, encoding: "utf8", env: { ...base, ...env } });
  return { code: r.status, stdout: r.stdout, stderr: r.stderr };
}

const lines = (log: string) => readFileSync(log, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as Signal);

describe("happy path", () => {
  test("attended, CI unset, mode Anonymous: spp signal records one Signal with all eight fields", () => {
    const c = checkout();
    const r = spp(c, ["signal", "step-unclear", "--by", "harden 3", "--evidence", "Verify named a missing script"]);
    const fp = fingerprint("harden", "3", "step-unclear");
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stdout, `recorded step-unclear harden 3 ${fp}\n`);
    assert.equal(c.log.endsWith("acme__app.signals.jsonl"), true);
    const [s, ...rest] = lines(c.log);
    assert.deepEqual(rest, []);
    assert.deepEqual(Object.keys(s).sort(), ["at", "category", "evidence", "fingerprint", "repo", "skill", "step", "version"]);
    assert.deepEqual({ ...s, at: "" }, { at: "", repo: "acme/app", category: "step-unclear", skill: "harden", step: "3", version, evidence: "Verify named a missing script", fingerprint: fp });
    assert.ok(!Number.isNaN(Date.parse(s.at)));
  });

  test("recordSignal charges the version it is given, not the current plugin version", async () => {
    const c = checkout();
    const env = { CLAUDE_CODE_SESSION_ATTENDED: "1", XDG_STATE_HOME: c.state, HOME: c.dir };
    const r = await recordSignal({ category: "contract-edited", skill: "harden", evidence: "x", version: "2.3.0" }, env, c.dir);
    assert.ok("signal" in r);
    assert.equal(r.signal.version, "2.3.0");
    assert.equal(r.signal.step, "");
    assert.deepEqual(lines(c.log), [r.signal]);
  });

  test("--maker-version passes through as the Signal's version", () => {
    const c = checkout();
    const r = spp(c, ["signal", "escaped-defect", "--by", "review", "--evidence", "x", "--maker-version", "2.2.0"]);
    assert.equal(r.code, 0, r.stderr);
    assert.equal(lines(c.log)[0].version, "2.2.0");
  });

  test("feedback pending groups by fingerprint, most Signals first, with every evidence text", () => {
    const c = checkout();
    for (const [cat, by, ev] of [["step-unclear", "harden 3", "a"], ["brief-gap", "build", "c"], ["step-unclear", "harden 3", "b"]]) {
      assert.equal(spp(c, ["signal", cat, "--by", by, "--evidence", ev]).code, 0);
    }
    const r = spp(c, ["feedback", "pending", "--json"]);
    assert.equal(r.code, 0, r.stderr);
    assert.deepEqual(JSON.parse(r.stdout), [
      { fingerprint: fingerprint("harden", "3", "step-unclear"), skill: "harden", step: "3", category: "step-unclear", count: 2, versions: { [version]: 2 }, evidence: ["a", "b"] },
      { fingerprint: fingerprint("build", "", "brief-gap"), skill: "build", step: "", category: "brief-gap", count: 1, versions: { [version]: 1 }, evidence: ["c"] },
    ]);
    const text = spp(c, ["feedback", "pending"]);
    assert.equal(text.code, 0, text.stderr);
    assert.equal(text.stdout, `${fingerprint("harden", "3", "step-unclear")} 2 harden 3 step-unclear\n${fingerprint("build", "", "brief-gap")} 1 build  brief-gap\n`);
  });

  test('--by "triage" with no step records step "" and the matching fingerprint', () => {
    const c = checkout();
    const r = spp(c, ["signal", "wish", "--by", "triage", "--evidence", "x"]);
    assert.equal(r.code, 0, r.stderr);
    const [s] = lines(c.log);
    assert.equal(s.step, "");
    assert.equal(s.fingerprint, fingerprint("triage", "", "wish"));
    assert.match(s.fingerprint, /^[0-9a-f]{12}$/);
  });
});

describe("edge cases", () => {
  const args = ["signal", "step-unclear", "--by", "harden 3", "--evidence", "x"];

  test("CI=true with the attended variable set records nothing: not recorded: CI", () => {
    const c = checkout();
    const r = spp(c, args, { CI: "true", CLAUDE_CODE_SESSION_ATTENDED: "1" });
    assert.deepEqual([r.code, r.stdout], [0, "not recorded: CI\n"]);
    assert.equal(existsSync(c.log), false);
  });

  test("CLAUDE_CODE_SESSION_ATTENDED=0, and unset: not recorded: not an attended session", () => {
    for (const env of [{ CLAUDE_CODE_SESSION_ATTENDED: "0" }, {}] as Record<string, string>[]) {
      const c = checkout();
      const r = spp(c, args, env);
      assert.deepEqual([r.code, r.stdout], [0, "not recorded: not an attended session\n"]);
      assert.equal(existsSync(c.log), false);
    }
  });

  test("mode Off, and no Self-improvement line: not recorded: Self-improvement mode is Off", () => {
    for (const mode of ["Off", null]) {
      const c = checkout(mode);
      const r = spp(c, args);
      assert.deepEqual([r.code, r.stdout], [0, "not recorded: Self-improvement mode is Off\n"]);
      assert.equal(existsSync(c.log), false);
    }
  });

  test("a torn line between two good ones: feedback pending counts the two good ones", () => {
    const c = checkout();
    assert.equal(spp(c, args).code, 0);
    appendFileSync(c.log, '{"at":"torn\n\n');
    assert.equal(spp(c, [...args.slice(0, -1), "y"]).code, 0);
    const r = spp(c, ["feedback", "pending"]);
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stdout, `${fingerprint("harden", "3", "step-unclear")} 2 harden 3 step-unclear\n`);
  });

  test("no log file: feedback pending --json prints [] and plain prints nothing", () => {
    const c = checkout();
    mkdirSync(c.state, { recursive: true });
    assert.deepEqual(spp(c, ["feedback", "pending", "--json"]), { code: 0, stdout: "[]\n", stderr: "" });
    assert.deepEqual(spp(c, ["feedback", "pending"]), { code: 0, stdout: "", stderr: "" });
  });
});

describe("error paths", () => {
  test("an unknown category exits 2 with the usage on stderr and no log file", () => {
    const c = checkout();
    const r = spp(c, ["signal", "not-a-category", "--by", "harden 3", "--evidence", "x"]);
    assert.equal(r.code, 2);
    assert.match(r.stderr, /usage: spp signal/);
    assert.equal(existsSync(c.log), false);
  });

  test("a missing --evidence or --by exits 2 with the usage on stderr", () => {
    const c = checkout();
    for (const args of [["--by", "harden 3"], ["--evidence", "x"]]) {
      const r = spp(c, ["signal", "step-unclear", ...args]);
      assert.equal(r.code, 2);
      assert.match(r.stderr, /usage: spp signal/);
    }
    assert.equal(existsSync(c.log), false);
  });

  // A checkout with the Routing block but no origin remote.
  function noOrigin() {
    const c = checkout();
    spawnSync("git", ["remote", "remove", "origin"], { cwd: c.dir });
    return c;
  }

  test("CI=true spp signal in a checkout with no origin exits 0 and prints not recorded: CI", () => {
    const c = noOrigin();
    const r = spp(c, ["signal", "wish", "--by", "triage", "--evidence", "x"], { CI: "true" });
    assert.deepEqual([r.code, r.stdout], [0, "not recorded: CI\n"]);
  });

  test("attended, mode Anonymous, no origin: exit 1, spp signal: and the origin message on stderr, no Signal file", () => {
    const c = noOrigin();
    const r = spp(c, ["signal", "wish", "--by", "triage", "--evidence", "x"]);
    assert.equal(r.code, 1);
    assert.match(r.stderr, /^spp signal: cannot tell this checkout's GitHub repository from its origin remote/);
    assert.equal(existsSync(c.log), false);
  });

  test("recordSignal with no repo and XDG_STATE_HOME under a regular file returns { failed } and throws nothing", async () => {
    const c = checkout();
    writeFileSync(join(c.dir, "blocker"), "x");
    const env = { CLAUDE_CODE_SESSION_ATTENDED: "1", XDG_STATE_HOME: join(c.dir, "blocker", "state"), HOME: c.dir };
    const r = await recordSignal({ category: "wish", skill: "triage", evidence: "x" }, env, c.dir);
    assert.ok("failed" in r, JSON.stringify(r));
    assert.match(r.failed, /ENOTDIR|EEXIST/);
  });

  test("recordSignal with no repo resolves it from the checkout in dir", async () => {
    const c = checkout();
    const r = await recordSignal({ category: "wish", skill: "triage", evidence: "x" }, { CLAUDE_CODE_SESSION_ATTENDED: "1", XDG_STATE_HOME: c.state, HOME: c.dir }, c.dir);
    assert.ok("signal" in r, JSON.stringify(r));
    assert.equal(r.signal.repo, "acme/app");
    assert.deepEqual(lines(c.log), [r.signal]);
  });
});

describe("fix round (Refs #342)", () => {
  // F9: --by went through its own split, so "Harden 3" charged skill "Harden" and split one step's Signals in two.
  test('--by "Harden 3" exits 2 like every other --by, and records nothing', () => {
    const c = checkout();
    const r = spp(c, ["signal", "step-unclear", "--by", "Harden 3", "--evidence", "x"]);
    assert.equal(r.code, 2);
    assert.match(r.stderr, /--by must start with a lowercase skill name/);
    assert.equal(existsSync(c.log), false);
  });

  // F12: the duplicate check lived in one caller; the log module now holds it for every writer.
  test("the same Signal twice is recorded once; the second says it is already in the Signal log", () => {
    const c = checkout();
    const args = ["signal", "step-unclear", "--by", "harden 3", "--evidence", "x"];
    assert.equal(spp(c, args).code, 0);
    const again = spp(c, args);
    assert.deepEqual([again.code, again.stdout], [0, "not recorded: already in the Signal log\n"]);
    assert.equal(lines(c.log).length, 1);
  });

  // F19: the gate ran in the caller and again in the writer, and each pass asked git for the origin.
  test("spp signal asks git for the origin once", () => {
    const c = checkout();
    const bin = mkdtempSync(join(tmpdir(), "spp-git-"));
    const calls = join(bin, "calls");
    const real = spawnSync("sh", ["-c", "command -v git"], { encoding: "utf8" }).stdout.trim();
    writeFileSync(join(bin, "git"), `#!/bin/sh\necho "$*" >> "${calls}"\nexec "${real}" "$@"\n`, { mode: 0o755 });
    const r = spp(c, ["signal", "wish", "--by", "triage", "--evidence", "x"], { CLAUDE_CODE_SESSION_ATTENDED: "1", PATH: `${bin}:${process.env.PATH}` });
    assert.equal(r.code, 0, r.stderr);
    assert.equal(readFileSync(calls, "utf8").split("\n").filter((l) => l === "remote get-url origin").length, 1);
  });

  test("recordSignal calls a lazy input only once the gate says yes", async () => {
    const off = checkout("Off");
    const env = { CLAUDE_CODE_SESSION_ATTENDED: "1", XDG_STATE_HOME: off.state, HOME: off.dir };
    let built = 0;
    const build = () => (built++, { category: "wish" as const, skill: "triage", evidence: "x" });
    assert.deepEqual(await recordSignal(build, env, off.dir), { skipped: "Self-improvement mode is Off" });
    assert.equal(built, 0);
    const on = checkout();
    const r = await recordSignal(build, { ...env, XDG_STATE_HOME: on.state, HOME: on.dir }, on.dir);
    assert.ok("signal" in r, JSON.stringify(r));
    assert.equal(built, 1);
  });
});

describe("fix round 3 (Refs #346)", () => {
  // R2-F21, R2-F27: collecting() reduced the gate to a boolean, so filing rebuilt the reason in a second copy.
  test("notCollecting gives the gate's own reason, or null when it would record", () => {
    const c = checkout();
    const env = { CLAUDE_CODE_SESSION_ATTENDED: "1", XDG_STATE_HOME: c.state, HOME: c.dir };
    assert.equal(notCollecting(env, c.dir), null);
    assert.equal(notCollecting({ ...env, CI: "true" }, c.dir), "CI");
    assert.equal(notCollecting(env, checkout("Off").dir), "Self-improvement mode is Off");
    assert.equal(notCollecting({ XDG_STATE_HOME: c.state, HOME: c.dir }, c.dir), "not an attended session");
  });

  // R2-F29: signals.ts kept its own copy of the mode list to validate a log line.
  test("the Signal log's mode check uses routing's one exported list", () => {
    assert.deepEqual(SELF_IMPROVEMENT_MODES, ["Off", "Anonymous", "Full Detail"]);
    const src = readFileSync(join(root, "spp", "src", "signals.ts"), "utf8");
    assert.doesNotMatch(src, /\["Off", "Anonymous", "Full Detail"\]/);
    assert.match(src, /SELF_IMPROVEMENT_MODES/);
  });

  // R2-F5: recordRun appended without reading the log.
  test("recordRun drops a run whose skill, step and artifact the runs log already holds", async () => {
    const c = checkout();
    const env = { CLAUDE_CODE_SESSION_ATTENDED: "1", XDG_STATE_HOME: c.state, HOME: c.dir };
    const run = { skill: "implement-issue", step: "fix round", artifact: "spp-panel-9/fix-2.patch" };
    assert.ok("run" in (await recordRun(run, env, c.dir)));
    assert.deepEqual(await recordRun(run, env, c.dir), { skipped: "already in the runs log" });
    assert.ok("run" in (await recordRun({ ...run, step: "" }, env, c.dir)));
  });
});
