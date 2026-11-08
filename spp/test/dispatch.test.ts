import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { readTrailer } from "../src/markers.ts";
import { runCase } from "./harness.ts";

const JQ = ".[] | [.id, .body, .user.login, .author_association] | @json";
const ISSUE = "https://github.com/acme/app/issues/";
const PLAN = `<!-- sdd-plan -->\n<!-- sdd-data: ${Buffer.from(JSON.stringify({ branch: "feat/epic" })).toString("base64")} -->`;

type Write = { cmd: string; argv: string[] };

// Runs `spp dispatch` in a case with a state directory of its own and only the attended variables `env` gives, so
// the runner's CI and harness never leak in. Returns the result and the decision file's contents (null when absent).
async function dispatch(dir: string, env: Record<string, string> = { CLAUDE_CODE_SESSION_ATTENDED: "1" }) {
  const saved = { ...process.env };
  delete process.env.CI;
  delete process.env.CLAUDE_CODE_SESSION_ATTENDED;
  Object.assign(process.env, { XDG_STATE_HOME: join(dir, ".state") }, env);
  try {
    const r = await runCase("dispatch", dir);
    const file = join(dir, ".state", "spp", "acme__app.attended.json");
    return { ...r, decision: existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as unknown) : null };
  } finally {
    process.env = saved;
  }
}

// A case for `spp dispatch 12 <args>`: ticket 12 of Epic 197 in acme/app, held when `labels` says so.
function scratch(args: string[], labels: string[] = ["ready-for-agent"], assignees: string[] = []): string {
  const dir = mkdtempSync(join(tmpdir(), "spp-dispatch-"));
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
  test("spp dispatch 12 --driver bg: one claude --bg --worktree sdd-12 --name t-12 call and one progress write with worker t-12", async () => {
    const r = await dispatch(scratch(["--driver", "bg"]));
    assert.equal(r.code, 0, r.stderr);
    const writes = r.writes as Write[];
    assert.deepEqual(writes.map((w) => w.cmd), ["claude", "gh"]);
    const [claude, progress] = writes;
    assert.deepEqual(claude.argv.slice(0, 5), ["--bg", "--worktree", "sdd-12", "--name", "t-12"]);
    assert.equal(claude.argv.length, 6);
    const prompt = claude.argv[5];
    assert.match(prompt, /implement-issue/);
    assert.match(prompt, /https:\/\/github\.com\/acme\/app\/issues\/12/);
    const brief = /(\S+brief-12\.md)/.exec(prompt)?.[1];
    assert.ok(brief && existsSync(brief), `the prompt names the written brief: ${prompt}`);
    assert.match(readFileSync(brief, "utf8"), /An endpoint\./);
    assert.deepEqual(progress.argv.slice(0, 4), ["api", "-X", "POST", "repos/{owner}/{repo}/issues/12/comments"]);
    assert.equal(readTrailer(progress.argv.find((a) => a.startsWith("body="))!.slice(5))?.worker, "t-12");
    assert.match(r.stdout, /started t-12/);
  });

  test("spp dispatch 12 --driver subagent inside a git repository writes the brief and prints its path, with no claude call", async () => {
    const dir = scratch(["--driver", "subagent"]);
    assert.equal(spawnSync("git", ["init", "-q"], { cwd: dir }).status, 0);
    const r = await dispatch(dir);
    assert.equal(r.code, 0, r.stderr);
    assert.deepEqual(r.writes, []);
    assert.ok(existsSync(r.stdout.trim()), r.stdout);
  });
});

describe("happy path: the attended decision", () => {
  test("CLAUDE_CODE_SESSION_ATTENDED=1, CI unset: spp dispatch 12 --driver bg starts one claude --bg and passes {\"12\": true}", async () => {
    const r = await dispatch(scratch(["--driver", "bg"]));
    assert.equal(r.code, 0, r.stderr);
    assert.deepEqual((r.writes as Write[]).filter((w) => w.cmd === "claude").length, 1);
    assert.deepEqual(r.decision, { "12": true });
  });

  test('the same with --driver desktop, and with --driver subagent inside a git repository: the decision file holds {"12": true}', async () => {
    const desktop = await dispatch(scratch(["--driver", "desktop"]));
    assert.equal(desktop.code, 0, desktop.stderr);
    assert.deepEqual(desktop.decision, { "12": true });
    const dir = scratch(["--driver", "subagent"]);
    assert.equal(spawnSync("git", ["init", "-q"], { cwd: dir }).status, 0);
    const subagent = await dispatch(dir);
    assert.equal(subagent.code, 0, subagent.stderr);
    assert.deepEqual(subagent.decision, { "12": true });
  });
});

describe("edge cases: the attended decision", () => {
  test('CI=true: spp dispatch 12 --driver bg passes {"12": false}', async () => {
    const r = await dispatch(scratch(["--driver", "bg"]), { CI: "true", CLAUDE_CODE_SESSION_ATTENDED: "1" });
    assert.equal(r.code, 0, r.stderr);
    assert.deepEqual(r.decision, { "12": false });
  });

  test('a decision file holding {"7": true}: dispatch 12 keeps "7" and adds "12"', async () => {
    const dir = scratch(["--driver", "bg"]);
    mkdirSync(join(dir, ".state", "spp"), { recursive: true });
    writeFileSync(join(dir, ".state", "spp", "acme__app.attended.json"), '{"7": true}');
    const r = await dispatch(dir);
    assert.equal(r.code, 0, r.stderr);
    assert.deepEqual(r.decision, { "7": true, "12": true });
  });
});

describe("error paths: the attended decision", () => {
  test("ticket 12 held by claimed: exit 1 and no decision file", async () => {
    const r = await dispatch(scratch(["--driver", "bg"], ["ready-for-agent", "claimed"]));
    assert.equal(r.code, 1);
    assert.equal(r.decision, null);
  });
});

describe("edge cases", () => {
  // #305: only the subagent Driver needs the session folder to be a checkout.
  test("spp dispatch 12 --driver desktop outside a git repository still writes the brief and prints its path", async () => {
    const r = await dispatch(scratch(["--driver", "desktop"]));
    assert.equal(r.code, 0, r.stderr);
    assert.ok(existsSync(r.stdout.trim()), r.stdout);
  });

  test("spp dispatch 12 --driver bg outside a git repository still starts one claude --bg session", async () => {
    const r = await dispatch(scratch(["--driver", "bg"]));
    assert.equal(r.code, 0, r.stderr);
    assert.deepEqual((r.writes as Write[]).filter((w) => w.cmd === "claude").map((w) => w.argv[0]), ["--bg"]);
  });

  test("ticket 12 claimed: refuses, no claude call", async () => {
    const r = await dispatch(scratch(["--driver", "bg"], ["ready-for-agent", "claimed"]));
    assert.equal(r.code, 1);
    assert.match(r.stderr, /#12 is held/);
    assert.deepEqual(r.writes, []);
  });

  // F23 on #267.
  test("ticket 12 held only by an assignee: refuses naming the assignee, no claude call", async () => {
    const r = await dispatch(scratch(["--driver", "bg"], ["ready-for-agent"], ["alice"]));
    assert.equal(r.code, 1);
    assert.match(r.stderr, /#12 is held \(alice\)/);
    assert.deepEqual(r.writes, []);
  });
});

describe("error paths: claude", () => {
  // F23 on #267: a failed spawn records no worker, so the ticket stays dispatchable.
  test("a failing claude --bg spawn exits 1 with claude's reason and writes no progress comment", async () => {
    const dir = scratch(["--driver", "bg"]);
    writeFileSync(join(dir, "agents.json"), JSON.stringify({ "--bg --worktree sdd-12 --name t-12 *": { stderr: "claude: not logged in\n", code: 1 } }));
    const r = await dispatch(dir);
    assert.equal(r.code, 1);
    assert.match(r.stderr, /^spp dispatch: claude --bg failed: claude: not logged in$/m);
    assert.deepEqual((r.writes as Write[]).map((w) => w.cmd), ["claude"]);
  });
});

describe("error paths", () => {
  // #305: the spp:worker agent's worktree comes from the session folder, so a folder outside any repository cannot start one.
  test("spp dispatch 12 --driver subagent outside a git repository refuses before it reads GitHub", async () => {
    const dir = scratch(["--driver", "subagent"]);
    writeFileSync(join(dir, "gh.json"), "{}"); // any gh call now fails with "stub gh: no answer"
    const r = await dispatch(dir);
    assert.equal(r.code, 1);
    assert.match(r.stderr, /cuts its worktree/);
    assert.doesNotMatch(r.stderr, /stub gh/);
    assert.deepEqual(r.writes, []);
  });

  test("an unknown driver exits 2 with usage", async () => {
    const r = await dispatch(scratch(["--driver", "cloud"]));
    assert.equal(r.code, 2);
    assert.match(r.stderr, /usage: spp dispatch/);
    assert.deepEqual(r.writes, []);
  });
});
