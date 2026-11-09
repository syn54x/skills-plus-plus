import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { isAttended, passDecision, workerTicket } from "../src/attended.ts";
import { fingerprint, signalsFile } from "../src/signals.ts";
import { runCase } from "./harness.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

// A git checkout of acme/app on `branch`, in a folder named `folder`, with mode Anonymous, a state directory of its
// own, and ticket 12's passed decision `decision` (none when null).
function checkout(branch: string, decision: boolean | null, folder = "app") {
  const dir = join(mkdtempSync(join(tmpdir(), "spp-attended-")), folder);
  mkdirSync(dir);
  const state = join(dir, ".state");
  spawnSync("git", ["init", "-q", "-b", branch], { cwd: dir });
  spawnSync("git", ["remote", "add", "origin", "https://github.com/acme/app.git"], { cwd: dir });
  writeFileSync(join(dir, "CLAUDE.md"), "# app\n\n<!-- sdd-routing -->\n- Mode: org\n- Self-improvement mode: Anonymous\n<!-- /sdd-routing -->\n");
  const env = { XDG_STATE_HOME: state, HOME: dir };
  if (decision !== null) passDecision(env, "acme/app", 12, decision);
  return { dir, env, log: signalsFile(env, "acme/app") };
}

// A fake gh first on the PATH: it logs its argv to `log` and answers `{"state": <state>}`, or exits 1 when state is null.
function fakeGh(state: "OPEN" | "CLOSED" | null) {
  const bin = mkdtempSync(join(tmpdir(), "spp-attended-gh-"));
  const log = join(bin, "calls");
  const answer = state ? `echo '{"state":"${state}"}'` : "echo 'gh: HTTP 502' >&2; exit 1";
  writeFileSync(join(bin, "gh"), `#!/bin/sh\necho "$*" >> "${log}"\n${answer}\n`, { mode: 0o755 });
  return { PATH: `${bin}${delimiter}${process.env.PATH}`, calls: () => (existsSync(log) ? readFileSync(log, "utf8").split("\n").filter(Boolean) : []) };
}

// Runs `spp signal step-unclear --by "harden 3" --evidence x` in the checkout with only the variables `env` gives,
// with a gh that finds the issue `state` (OPEN unless a test says otherwise).
function signal(c: ReturnType<typeof checkout>, env: Record<string, string>, gh = fakeGh("OPEN")) {
  const base: NodeJS.ProcessEnv = { ...process.env, ...c.env, PATH: gh.PATH };
  delete base.CI;
  delete base.CLAUDE_CODE_SESSION_ATTENDED;
  const args = ["signal", "step-unclear", "--by", "harden 3", "--evidence", "x"];
  const r = spawnSync(process.execPath, [join(root, "bin", "spp"), ...args], { cwd: c.dir, encoding: "utf8", env: { ...base, ...env } });
  return { code: r.status, stdout: r.stdout, stderr: r.stderr, ghCalls: gh.calls() };
}

const NOT_ATTENDED = "not recorded: not an attended session\n";
const recorded = (c: ReturnType<typeof checkout>) => (existsSync(c.log) ? readFileSync(c.log, "utf8").split("\n").filter(Boolean).length : 0);

describe("happy path", () => {
  test("true for 12 on sdd/12-invoice-endpoint with CLAUDE_CODE_SESSION_ATTENDED=0: spp signal records one Signal", () => {
    const c = checkout("sdd/12-invoice-endpoint", true);
    const r = signal(c, { CLAUDE_CODE_SESSION_ATTENDED: "0" });
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stdout, `recorded step-unclear harden 3 ${fingerprint("harden", "3", "step-unclear")}\n`);
    assert.equal(recorded(c), 1);
  });

  // F4: claude --bg --worktree sdd-12 starts the worker in folder sdd-12, before it cuts sdd/12-...
  test("true for 12 in a worktree folder sdd-12 on its starting branch, CLAUDE_CODE_SESSION_ATTENDED=0: records one Signal", () => {
    const c = checkout("worktree-sdd-12", true, "sdd-12");
    const r = signal(c, { CLAUDE_CODE_SESSION_ATTENDED: "0" });
    assert.equal(r.code, 0, r.stderr);
    assert.equal(recorded(c), 1);
  });
});

describe("workerTicket", () => {
  test("sdd/12-x is 12, folder sdd-12 is 12, the branch wins over the folder, and any other checkout is null", () => {
    assert.equal(workerTicket(checkout("sdd/12-invoice-endpoint", null).dir), 12);
    assert.equal(workerTicket(checkout("worktree-sdd-12", null, "sdd-12").dir), 12);
    assert.equal(workerTicket(checkout("sdd/7-other", null, "sdd-12").dir), 7);
    // The desktop driver's worker starts on a branch named sdd-<N>.
    assert.equal(workerTicket(checkout("sdd-12", null).dir), 12);
    assert.equal(workerTicket(checkout("sdd-12x", null).dir), null);
    assert.equal(workerTicket(checkout("main", null).dir), null);
    assert.equal(workerTicket(checkout("main", null, "sdd-12x").dir), null);
    assert.equal(workerTicket(mkdtempSync(join(tmpdir(), "spp-attended-nogit-"))), null);
  });
});

describe("a decision lasts while its issue is open", () => {
  // Round 2: a One-off is merged by a person, never by spp merge, so the worker drops the decision once its issue closes.
  test("issue 12 OPEN: one gh issue view, and the decision holds run after run", () => {
    const c = checkout("sdd/12-invoice-endpoint", true);
    const r = signal(c, { CLAUDE_CODE_SESSION_ATTENDED: "0" });
    assert.equal(r.code, 0, r.stderr);
    assert.deepEqual(r.ghCalls, ["issue view 12 -R acme/app --json state"]);
    assert.equal(recorded(c), 1);
    assert.notEqual(signal(c, { CLAUDE_CODE_SESSION_ATTENDED: "0" }).stdout, NOT_ATTENDED);
  });

  test("issue 12 CLOSED: no decision, and it is gone: a later run that finds 12 OPEN falls back to the harness signal", () => {
    const c = checkout("sdd/12-invoice-endpoint", true);
    const r = signal(c, { CLAUDE_CODE_SESSION_ATTENDED: "0" }, fakeGh("CLOSED"));
    assert.deepEqual([r.code, r.stdout], [0, NOT_ATTENDED]);
    const later = signal(c, { CLAUDE_CODE_SESSION_ATTENDED: "0" });
    assert.deepEqual([later.stdout, later.ghCalls], [NOT_ATTENDED, []]);
  });

  test("gh fails: no decision, the worker's own environment decides, the decision stays and the exit code is 0", () => {
    const c = checkout("sdd/12-invoice-endpoint", false);
    const r = signal(c, { CLAUDE_CODE_SESSION_ATTENDED: "1" }, fakeGh(null));
    assert.equal(r.code, 0, r.stderr);
    assert.equal(recorded(c), 1);
    assert.equal(signal(c, { CLAUDE_CODE_SESSION_ATTENDED: "1" }).stdout, NOT_ATTENDED);
  });

  test("no decision file: no gh call", () => {
    const c = checkout("sdd/12-invoice-endpoint", null);
    const r = signal(c, { CLAUDE_CODE_SESSION_ATTENDED: "1" });
    assert.equal(recorded(c), 1);
    assert.deepEqual(r.ghCalls, []);
  });
});

describe("one decision per ticket", () => {
  // F3: a shared file read, merged and rewritten lost a sibling dispatch's entry; each ticket now keeps its own.
  test("passDecision for 7 then 12 keeps both: 12's worker counts and 7's does not", () => {
    const c12 = checkout("sdd/12-invoice-endpoint", null);
    passDecision(c12.env, "acme/app", 7, false);
    passDecision(c12.env, "acme/app", 12, true);
    const c7 = { ...checkout("sdd/7-other", null), env: c12.env, log: c12.log };
    assert.equal(signal(c7, { CLAUDE_CODE_SESSION_ATTENDED: "1" }).stdout, NOT_ATTENDED);
    assert.equal(signal(c12, { CLAUDE_CODE_SESSION_ATTENDED: "0" }).code, 0);
    assert.equal(recorded(c12), 1);
  });
});

describe("edge cases", () => {
  test("false for 12 with CLAUDE_CODE_SESSION_ATTENDED=1: not recorded: not an attended session, no log file", () => {
    const c = checkout("sdd/12-invoice-endpoint", false);
    const r = signal(c, { CLAUDE_CODE_SESSION_ATTENDED: "1" });
    assert.deepEqual([r.code, r.stdout], [0, NOT_ATTENDED]);
    assert.equal(existsSync(c.log), false);
  });

  test("true for 12 with CI=true: not recorded: CI, no log file", () => {
    const c = checkout("sdd/12-invoice-endpoint", true);
    const r = signal(c, { CI: "true", CLAUDE_CODE_SESSION_ATTENDED: "1" });
    assert.deepEqual([r.code, r.stdout], [0, "not recorded: CI\n"]);
    assert.equal(existsSync(c.log), false);
  });

  test("a checkout on main, a worker of another ticket, or no decision: the same answer as isAttended(env)", () => {
    for (const [branch, decision] of [["main", true], ["sdd/7-other", true], ["sdd/12-invoice-endpoint", null]] as const) {
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

describe("only a closed issue ends a decision", () => {
  const JQ = ".[] | [.id, .body, .user.login, .author_association] | @json";
  const trailer = (d: unknown) => `<!-- sdd-data: ${Buffer.from(JSON.stringify(d)).toString("base64")} -->`;

  // R2-F6, R2-F7: the build skill resumes the same worker after a needs-info hand-back, so the hand-back records its
  // Signal from the passed decision alone and leaves the decision in place.
  test("spp hand-back 12 needs-info on sdd/12-x, attended only by its passed decision: one Signal, and the decision still counts", async () => {
    const c = checkout("sdd/12-invoice-endpoint", true);
    const progress = `<!-- sdd-progress -->\n${trailer({ verifyPinBy: { skill: "harden", version: "1.0.0" } })}\n`;
    writeFileSync(join(c.dir, "args"), ["https://github.com/acme/app/issues/12", "needs-info", "--reason", "r"].join("\n") + "\n");
    writeFileSync(join(c.dir, "gh.json"), JSON.stringify({
      [`api repos/acme/app/issues/12/comments --paginate --jq ${JQ}`]: { stdout: JSON.stringify([900, progress, "maint", "OWNER"]) + "\n" },
      "issue view 12 -R acme/app --json state": { stdout: { state: "OPEN" } },
    }));
    const saved = { ...process.env };
    Object.assign(process.env, c.env);
    delete process.env.CI;
    delete process.env.CLAUDE_CODE_SESSION_ATTENDED;
    try {
      const r = await runCase("hand-back", c.dir);
      assert.equal(r.code, 0, r.stderr);
    } finally {
      process.env = saved;
    }
    assert.equal(recorded(c), 1);
    assert.equal(signal(c, {}).code, 0);
    assert.equal(recorded(c), 2);
  });
});

describe("the board mirrors workerTicket", () => {
  // R2-F3: hooks/board/register.tsx cannot import spp, so it copies the two patterns, which must stay the same.
  test("register.tsx's WORKER_BRANCH and WORKER_FOLDER are attended.ts's", () => {
    const patterns = (file: string) => ["WORKER_BRANCH", "WORKER_FOLDER"].map((name) => new RegExp(`const ${name} = (/.+/)$`, "m").exec(readFileSync(join(root, file), "utf8"))?.[1]);
    const spp = patterns("spp/src/attended.ts");
    assert.ok(spp.every(Boolean), "attended.ts names both patterns");
    assert.deepEqual(patterns("hooks/board/register.tsx"), spp);
  });
});
