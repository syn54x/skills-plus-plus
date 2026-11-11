import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { runCase } from "./harness.ts";

const JQ = ".[] | [.id, .body, .user.login, .author_association] | @json";
const ISSUE = "https://github.com/acme/app/issues/";
const PLAN = `<!-- sdd-plan -->\n<!-- sdd-data: ${Buffer.from(JSON.stringify({ branch: "feat/epic" })).toString("base64")} -->`;

// Runs `spp dispatch` in a case with a state directory of its own and only the attended variables `env` gives, so
// the runner's CI and harness never leak in. Returns the result and the passed decisions, one file per ticket, as
// { "<N>": true | false } (null when there are none).
async function dispatch(dir: string, env: Record<string, string> = { CLAUDE_CODE_SESSION_ATTENDED: "1" }) {
  const saved = { ...process.env };
  delete process.env.CI;
  delete process.env.CLAUDE_CODE_SESSION_ATTENDED;
  Object.assign(process.env, { XDG_STATE_HOME: join(dir, ".state") }, env);
  try {
    const r = await runCase("dispatch", dir);
    const folder = join(dir, ".state", "spp", "acme__app.attended");
    const decision = existsSync(folder) ? Object.fromEntries(readdirSync(folder).map((n) => [n, readFileSync(join(folder, n), "utf8") === "true\n"])) : null;
    return { ...r, decision };
  } finally {
    process.env = saved;
  }
}

// A case for `spp dispatch 12 <args>`: ticket 12 of Epic 197 in acme/app, held when `labels` says so, in a git
// repository unless `repo` is false.
function scratch(args: string[] = [], labels: string[] = ["ready-for-agent"], assignees: string[] = [], repo = true): string {
  const dir = mkdtempSync(join(tmpdir(), "spp-dispatch-"));
  if (repo) assert.equal(spawnSync("git", ["init", "-q"], { cwd: dir }).status, 0);
  const gh = {
    "issue view 12 --json url,labels,assignees": {
      stdout: { url: ISSUE + 12, labels: labels.map((name) => ({ name })), assignees: assignees.map((login) => ({ login })) },
    },
    "issue view 12 --json number,title,url,body,parent": {
      stdout: { number: 12, title: "Invoice endpoint", url: ISSUE + 12, body: "## What to build\n\nAn endpoint.\n", parent: { url: ISSUE + 197 } },
    },
    [`api repos/acme/app/issues/197/comments --paginate --jq ${JQ}`]: { stdout: JSON.stringify([1, PLAN, "maint", "OWNER"]) + "\n" },
    [`api repos/{owner}/{repo}/issues/12/comments --paginate --jq ${JQ}`]: { stdout: "" },
  };
  writeFileSync(join(dir, "gh.json"), JSON.stringify(gh));
  writeFileSync(join(dir, "CLAUDE.md"), "<!-- sdd-routing -->\n- Mode: org\n- Laws: CLAUDE.md\n<!-- /sdd-routing -->\n");
  writeFileSync(join(dir, "args"), ["12", ...args].join("\n") + "\n");
  return dir;
}

describe("happy path", () => {
  test("spp dispatch 12 inside a git repository writes the brief and prints its path, with no claude call", async () => {
    const r = await dispatch(scratch());
    assert.equal(r.code, 0, r.stderr);
    assert.deepEqual(r.writes, []);
    assert.ok(existsSync(r.stdout.trim()), r.stdout);
    assert.match(readFileSync(r.stdout.trim(), "utf8"), /An endpoint\./);
  });
});

describe("happy path: the attended decision", () => {
  test('CLAUDE_CODE_SESSION_ATTENDED=1, CI unset: spp dispatch 12 passes {"12": true}', async () => {
    const r = await dispatch(scratch());
    assert.equal(r.code, 0, r.stderr);
    assert.deepEqual(r.decision, { "12": true });
  });
});

describe("edge cases: the attended decision", () => {
  test('CI=true: spp dispatch 12 passes {"12": false}', async () => {
    const r = await dispatch(scratch(), { CI: "true", CLAUDE_CODE_SESSION_ATTENDED: "1" });
    assert.equal(r.code, 0, r.stderr);
    assert.deepEqual(r.decision, { "12": false });
  });

  test("a passed decision for 7: dispatch 12 leaves 7's file as it was and writes 12's", async () => {
    const dir = scratch();
    mkdirSync(join(dir, ".state", "spp", "acme__app.attended"), { recursive: true });
    writeFileSync(join(dir, ".state", "spp", "acme__app.attended", "7"), "true\n");
    const r = await dispatch(dir);
    assert.equal(r.code, 0, r.stderr);
    assert.deepEqual(r.decision, { "7": true, "12": true });
  });
});

describe("error paths: the attended decision", () => {
  test("ticket 12 held by claimed: exit 1 and no decision file", async () => {
    const r = await dispatch(scratch([], ["ready-for-agent", "claimed"]));
    assert.equal(r.code, 1);
    assert.equal(r.decision, null);
  });
});

describe("edge cases", () => {
  test("ticket 12 claimed: refuses with no brief and no write", async () => {
    const r = await dispatch(scratch([], ["ready-for-agent", "claimed"]));
    assert.equal(r.code, 1);
    assert.match(r.stderr, /#12 is held/);
    assert.equal(r.stdout, "");
    assert.deepEqual(r.writes, []);
  });

  // F23 on #267.
  test("ticket 12 held only by an assignee: refuses naming the assignee", async () => {
    const r = await dispatch(scratch([], ["ready-for-agent"], ["alice"]));
    assert.equal(r.code, 1);
    assert.match(r.stderr, /#12 is held \(alice\)/);
    assert.deepEqual(r.writes, []);
  });
});

describe("error paths", () => {
  // #305: the spp:worker agent's worktree comes from the session folder, so a folder outside any repository cannot start one.
  test("spp dispatch 12 outside a git repository refuses before it reads GitHub, naming the repository and no other Driver", async () => {
    const dir = scratch([], ["ready-for-agent"], [], false);
    writeFileSync(join(dir, "gh.json"), "{}"); // any gh call now fails with "stub gh: no answer"
    const r = await dispatch(dir);
    assert.equal(r.code, 1);
    assert.match(r.stderr, /not inside a git repository/);
    assert.match(r.stderr, /repository that owns #12/);
    assert.doesNotMatch(r.stderr, /driver/i);
    assert.doesNotMatch(r.stderr, /stub gh/);
    assert.deepEqual(r.writes, []);
  });

  test("spp dispatch 12 --driver bg exits 2 naming --driver, with no claude call", async () => {
    const r = await dispatch(scratch(["--driver", "bg"]));
    assert.equal(r.code, 2);
    assert.match(r.stderr, /unknown flag --driver/);
    assert.match(r.stderr, /usage: spp dispatch/);
    assert.deepEqual(r.writes, []);
  });
});
