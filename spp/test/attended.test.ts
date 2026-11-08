import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { attendedFile, isAttended } from "../src/attended.ts";
import { fingerprint, signalsFile } from "../src/signals.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

// A git checkout of acme/app on `branch` with mode Anonymous, a state directory of its own, and a decision file
// holding `decision` (none when null).
function checkout(branch: string, decision: string | null) {
  const dir = mkdtempSync(join(tmpdir(), "spp-attended-"));
  const state = join(dir, ".state");
  spawnSync("git", ["init", "-q", "-b", branch], { cwd: dir });
  spawnSync("git", ["remote", "add", "origin", "https://github.com/acme/app.git"], { cwd: dir });
  writeFileSync(join(dir, "CLAUDE.md"), "# app\n\n<!-- sdd-routing -->\n- Mode: org\n- Self-improvement mode: Anonymous\n<!-- /sdd-routing -->\n");
  const env = { XDG_STATE_HOME: state, HOME: dir };
  if (decision !== null) {
    mkdirSync(join(state, "spp"), { recursive: true });
    writeFileSync(attendedFile(env, "acme/app"), decision);
  }
  return { dir, env, log: signalsFile(env, "acme/app") };
}

// Runs `spp signal step-unclear --by "harden 3" --evidence x` in the checkout with only the variables `env` gives.
function signal(c: ReturnType<typeof checkout>, env: Record<string, string>) {
  const base: NodeJS.ProcessEnv = { ...process.env, ...c.env };
  delete base.CI;
  delete base.CLAUDE_CODE_SESSION_ATTENDED;
  const args = ["signal", "step-unclear", "--by", "harden 3", "--evidence", "x"];
  const r = spawnSync(process.execPath, [join(root, "bin", "spp"), ...args], { cwd: c.dir, encoding: "utf8", env: { ...base, ...env } });
  return { code: r.status, stdout: r.stdout, stderr: r.stderr };
}

describe("happy path", () => {
  test('{"12": true} on sdd/12-invoice-endpoint with CLAUDE_CODE_SESSION_ATTENDED=0: spp signal records one Signal', () => {
    const c = checkout("sdd/12-invoice-endpoint", '{"12": true}');
    const r = signal(c, { CLAUDE_CODE_SESSION_ATTENDED: "0" });
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stdout, `recorded step-unclear harden 3 ${fingerprint("harden", "3", "step-unclear")}\n`);
    assert.equal(readFileSync(c.log, "utf8").split("\n").filter(Boolean).length, 1);
  });
});

describe("edge cases", () => {
  test('{"12": false} with CLAUDE_CODE_SESSION_ATTENDED=1: not recorded: not an attended session, no log file', () => {
    const c = checkout("sdd/12-invoice-endpoint", '{"12": false}');
    const r = signal(c, { CLAUDE_CODE_SESSION_ATTENDED: "1" });
    assert.deepEqual([r.code, r.stdout], [0, "not recorded: not an attended session\n"]);
    assert.equal(existsSync(c.log), false);
  });

  test('{"12": true} with CI=true: not recorded: CI, no log file', () => {
    const c = checkout("sdd/12-invoice-endpoint", '{"12": true}');
    const r = signal(c, { CI: "true", CLAUDE_CODE_SESSION_ATTENDED: "1" });
    assert.deepEqual([r.code, r.stdout], [0, "not recorded: CI\n"]);
    assert.equal(existsSync(c.log), false);
  });

  test("a worker on main, with no entry for its issue, or with a decision file that is not JSON: the same answer as isAttended(env)", () => {
    for (const [branch, decision] of [["main", '{"12": true}'], ["sdd/12-invoice-endpoint", '{"7": true}'], ["sdd/12-invoice-endpoint", "not json"], ["sdd/12-invoice-endpoint", null]] as const) {
      const c = checkout(branch, decision);
      for (const attended of ["0", "1"]) {
        const env = { ...c.env, CLAUDE_CODE_SESSION_ATTENDED: attended };
        assert.equal(isAttended(env, { repo: "acme/app", dir: c.dir }), isAttended(env), `${branch} ${decision} ${attended}`);
        assert.equal(isAttended(env), attended === "1");
      }
    }
  });
});
