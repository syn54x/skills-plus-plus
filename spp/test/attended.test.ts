import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { attendedFile, isAttended, passDecision, workerTicket } from "../src/attended.ts";
import { fingerprint, signalsFile } from "../src/signals.ts";
import { runCase } from "./harness.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

// A git checkout of acme/app on `branch`, in a folder named `folder`, with mode Anonymous, a state directory of its
// own, and ticket 12's passed decision file holding `decision` (none when null).
function checkout(branch: string, decision: string | null, folder = "app") {
  const dir = join(mkdtempSync(join(tmpdir(), "spp-attended-")), folder);
  mkdirSync(dir);
  const state = join(dir, ".state");
  spawnSync("git", ["init", "-q", "-b", branch], { cwd: dir });
  spawnSync("git", ["remote", "add", "origin", "https://github.com/acme/app.git"], { cwd: dir });
  writeFileSync(join(dir, "CLAUDE.md"), "# app\n\n<!-- sdd-routing -->\n- Mode: org\n- Self-improvement mode: Anonymous\n<!-- /sdd-routing -->\n");
  const env = { XDG_STATE_HOME: state, HOME: dir };
  if (decision !== null) {
    mkdirSync(dirname(attendedFile(env, "acme/app", 12)), { recursive: true });
    writeFileSync(attendedFile(env, "acme/app", 12), decision);
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
  test("true for 12 on sdd/12-invoice-endpoint with CLAUDE_CODE_SESSION_ATTENDED=0: spp signal records one Signal", () => {
    const c = checkout("sdd/12-invoice-endpoint", "true\n");
    const r = signal(c, { CLAUDE_CODE_SESSION_ATTENDED: "0" });
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stdout, `recorded step-unclear harden 3 ${fingerprint("harden", "3", "step-unclear")}\n`);
    assert.equal(readFileSync(c.log, "utf8").split("\n").filter(Boolean).length, 1);
  });

  // F4: claude --bg --worktree sdd-12 starts the worker in folder sdd-12, before it cuts sdd/12-...
  test("true for 12 in a worktree folder sdd-12 on its starting branch, CLAUDE_CODE_SESSION_ATTENDED=0: records one Signal", () => {
    const c = checkout("worktree-sdd-12", "true\n", "sdd-12");
    const r = signal(c, { CLAUDE_CODE_SESSION_ATTENDED: "0" });
    assert.equal(r.code, 0, r.stderr);
    assert.equal(readFileSync(c.log, "utf8").split("\n").filter(Boolean).length, 1);
  });
});

describe("workerTicket", () => {
  test("sdd/12-x is 12, folder sdd-12 is 12, the branch wins over the folder, and any other checkout is null", () => {
    assert.equal(workerTicket(checkout("sdd/12-invoice-endpoint", null).dir), 12);
    assert.equal(workerTicket(checkout("worktree-sdd-12", null, "sdd-12").dir), 12);
    assert.equal(workerTicket(checkout("sdd/7-other", null, "sdd-12").dir), 7);
    assert.equal(workerTicket(checkout("main", null).dir), null);
    assert.equal(workerTicket(checkout("main", null, "sdd-12x").dir), null);
    assert.equal(workerTicket(mkdtempSync(join(tmpdir(), "spp-attended-nogit-"))), null);
  });
});

describe("one file per ticket", () => {
  // F3: a shared file read, merged and rewritten lost a sibling dispatch's entry; each ticket now writes only its own.
  test("passDecision for 7 and 12 writes two files, and neither write reads or changes the other", () => {
    const { env } = checkout("main", null);
    passDecision(env, "acme/app", 7, false);
    passDecision(env, "acme/app", 12, true);
    assert.deepEqual(readdirSync(dirname(attendedFile(env, "acme/app", 12))).sort(), ["12", "7"]);
    assert.deepEqual([readFileSync(attendedFile(env, "acme/app", 7), "utf8"), readFileSync(attendedFile(env, "acme/app", 12), "utf8")], ["false\n", "true\n"]);
  });
});

describe("edge cases", () => {
  test("false for 12 with CLAUDE_CODE_SESSION_ATTENDED=1: not recorded: not an attended session, no log file", () => {
    const c = checkout("sdd/12-invoice-endpoint", "false\n");
    const r = signal(c, { CLAUDE_CODE_SESSION_ATTENDED: "1" });
    assert.deepEqual([r.code, r.stdout], [0, "not recorded: not an attended session\n"]);
    assert.equal(existsSync(c.log), false);
  });

  test("true for 12 with CI=true: not recorded: CI, no log file", () => {
    const c = checkout("sdd/12-invoice-endpoint", "true\n");
    const r = signal(c, { CI: "true", CLAUDE_CODE_SESSION_ATTENDED: "1" });
    assert.deepEqual([r.code, r.stdout], [0, "not recorded: CI\n"]);
    assert.equal(existsSync(c.log), false);
  });

  test("a checkout on main, a worker of another ticket, an unreadable decision or none: the same answer as isAttended(env)", () => {
    for (const [branch, decision] of [["main", "true\n"], ["sdd/7-other", "true\n"], ["sdd/12-invoice-endpoint", "maybe"], ["sdd/12-invoice-endpoint", null]] as const) {
      const c = checkout(branch, decision);
      for (const attended of ["0", "1"]) {
        const env = { ...c.env, CLAUDE_CODE_SESSION_ATTENDED: attended };
        assert.equal(isAttended(env, { repo: "acme/app", dir: c.dir }), isAttended(env), `${branch} ${decision} ${attended}`);
        assert.equal(isAttended(env), attended === "1");
      }
    }
  });
});

describe("the harness edge (portability law)", () => {
  // F6: the harness's own variable names live in hooks/attended.json, never in spp's source.
  test("no file under spp/src names CLAUDE_CODE_SESSION_ATTENDED, and hooks/attended.json maps CLAUDE_CODE_SESSION_ATTENDED to 1", () => {
    const src = join(root, "spp", "src");
    const named = readdirSync(src, { recursive: true, encoding: "utf8" }).filter((f) => f.endsWith(".ts") && readFileSync(join(src, f), "utf8").includes("CLAUDE_CODE_SESSION_ATTENDED"));
    assert.deepEqual(named, []);
    assert.deepEqual((JSON.parse(readFileSync(join(root, "hooks", "attended.json"), "utf8")) as { attended: unknown }).attended, { CLAUDE_CODE_SESSION_ATTENDED: "1" });
  });
});

describe("no decision outlives its worker", () => {
  const JQ = ".[] | [.id, .body, .user.login, .author_association] | @json";

  // F5: spp hand-back deletes the handed-back ticket's file and leaves the others.
  test("spp hand-back acme/app#12 deletes 12's passed decision and keeps 7's", async () => {
    const { env } = checkout("main", null);
    passDecision(env, "acme/app", 7, true);
    passDecision(env, "acme/app", 12, true);
    const dir = mkdtempSync(join(tmpdir(), "spp-attended-handback-"));
    writeFileSync(join(dir, "args"), ["https://github.com/acme/app/issues/12", "needs-info", "--reason", "r"].join("\n") + "\n");
    writeFileSync(join(dir, "gh.json"), JSON.stringify({ [`api repos/acme/app/issues/12/comments --paginate --jq ${JQ}`]: { stdout: "" } }));
    const saved = { ...process.env };
    Object.assign(process.env, { XDG_STATE_HOME: env.XDG_STATE_HOME, CI: "true" });
    try {
      const r = await runCase("hand-back", dir);
      assert.equal(r.code, 0, r.stderr);
    } finally {
      process.env = saved;
    }
    assert.equal(existsSync(attendedFile(env, "acme/app", 12)), false);
    assert.equal(existsSync(attendedFile(env, "acme/app", 7)), true);
  });
});
