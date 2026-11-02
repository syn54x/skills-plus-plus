import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { readTrailer } from "../src/markers.ts";
import { runCase } from "./harness.ts";

const JQ = ".[] | [.id, .body] | @json";
const ISSUE = "https://github.com/acme/app/issues/";
const PLAN = `<!-- sdd-plan -->\n<!-- sdd-data: ${Buffer.from(JSON.stringify({ branch: "feat/epic" })).toString("base64")} -->`;

type Write = { cmd: string; argv: string[] };

// A case for `spp dispatch 12 <args>`: ticket 12 of Epic 197 in acme/app, held when `labels` says so.
function scratch(args: string[], labels: string[] = ["ready-for-agent"]): string {
  const dir = mkdtempSync(join(tmpdir(), "spp-dispatch-"));
  const gh = {
    "issue view 12 --json url,labels,assignees": { stdout: { url: ISSUE + 12, labels: labels.map((name) => ({ name })), assignees: [] } },
    "issue view 12 --json number,title,url,body,parent": {
      stdout: { number: 12, title: "Invoice endpoint", url: ISSUE + 12, body: "## What to build\n\nAn endpoint.\n", parent: { url: ISSUE + 197 } },
    },
    [`api repos/acme/app/issues/197/comments --paginate --jq ${JQ}`]: { stdout: JSON.stringify([1, PLAN]) + "\n" },
    [`api repos/{owner}/{repo}/issues/12/comments --paginate --jq ${JQ}`]: { stdout: "" },
  };
  writeFileSync(join(dir, "gh.json"), JSON.stringify(gh));
  writeFileSync(join(dir, "CLAUDE.md"), "<!-- sdd-routing -->\n- Mode: org\n- Laws: CLAUDE.md\n<!-- /sdd-routing -->\n");
  writeFileSync(join(dir, "args"), ["12", ...args].join("\n") + "\n");
  return dir;
}

describe("happy path", () => {
  test("spp dispatch 12 --driver bg: one claude --bg --worktree sdd-12 --name t-12 call and one progress write with worker t-12", async () => {
    const r = await runCase("dispatch", scratch(["--driver", "bg"]));
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

  test("spp dispatch 12 --driver subagent writes the brief and prints its path, with no claude call", async () => {
    const r = await runCase("dispatch", scratch(["--driver", "subagent"]));
    assert.equal(r.code, 0, r.stderr);
    assert.deepEqual(r.writes, []);
    assert.ok(existsSync(r.stdout.trim()), r.stdout);
  });
});

describe("edge cases", () => {
  test("ticket 12 claimed: refuses, no claude call", async () => {
    const r = await runCase("dispatch", scratch(["--driver", "bg"], ["ready-for-agent", "claimed"]));
    assert.equal(r.code, 1);
    assert.match(r.stderr, /#12 is held/);
    assert.deepEqual(r.writes, []);
  });
});

describe("error paths", () => {
  test("an unknown driver exits 2 with usage", async () => {
    const r = await runCase("dispatch", scratch(["--driver", "cloud"]));
    assert.equal(r.code, 2);
    assert.match(r.stderr, /usage: spp dispatch/);
    assert.deepEqual(r.writes, []);
  });
});
