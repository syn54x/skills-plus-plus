import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { readTrailer } from "../src/markers.ts";
import { runCase } from "./harness.ts";

const JQ = ".[] | [.id, .body] | @json";
const BRANCH = "feat/rebuild-s-from-scratch-as-spp-2-0";
const TITLE = "Rebuild S++ from scratch as spp 2.0!";
const ENV = { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@x", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@x" };

type Write = { argv: string[] };

const git = (cwd: string, ...args: string[]) => execFileSync("git", args, { cwd, env: ENV, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const trailer = (data: unknown) => `<!-- sdd-data: ${Buffer.from(JSON.stringify(data)).toString("base64")} -->`;
const planComment = (branch: string) => JSON.stringify([601, `<!-- sdd-plan -->\n## Plan\n${trailer({ branch })}\n`]) + "\n";

// A clone whose origin holds `main` and `next` (each with one commit), with the stub gh answers for Epic 197 in it.
function scratch(plan: string): { clone: string; origin: string } {
  const root = mkdtempSync(join(tmpdir(), "spp-branch-"));
  const origin = join(root, "origin.git");
  const clone = join(root, "clone");
  git(root, "init", "--bare", "-b", "main", origin);
  git(root, "clone", "-q", origin, clone);
  for (const name of ["main", "next"]) {
    git(clone, "checkout", "-q", "-B", name);
    writeFileSync(join(clone, `${name}.txt`), name);
    git(clone, "add", "-A");
    git(clone, "commit", "-q", "-m", name);
    git(clone, "push", "-q", "origin", name);
  }
  git(clone, "checkout", "-q", "main");
  const answers = {
    "issue view 197 --json title": { stdout: { title: TITLE } },
    [`api repos/{owner}/{repo}/issues/197/comments --paginate --jq ${JQ}`]: { stdout: plan },
  };
  writeFileSync(join(clone, "gh.json"), JSON.stringify(answers));
  return { clone, origin };
}

const args = (clone: string, ...a: string[]) => writeFileSync(join(clone, "args"), a.join("\n") + "\n");
const body = (w: Write) => w.argv.find((a) => a.startsWith("body="))!.slice(5);

describe("happy path", () => {
  test("spp branch 197 --from next switches to feat/<slug> cut from origin/next, pushes it and writes the plan once", async () => {
    const { clone, origin } = scratch("");
    args(clone, "197", "--from", "next");
    const r = await runCase("branch", clone);
    assert.equal(r.code, 0, r.stderr);
    assert.equal(git(clone, "branch", "--show-current"), BRANCH);
    assert.equal(git(clone, "rev-parse", "HEAD"), git(clone, "rev-parse", "origin/next"));
    assert.equal(git(origin, "rev-parse", BRANCH), git(clone, "rev-parse", "origin/next"));
    assert.equal(git(clone, "rev-parse", "--abbrev-ref", `${BRANCH}@{upstream}`), `origin/${BRANCH}`);
    const writes = r.writes as Write[];
    assert.equal(writes.length, 1);
    assert.deepEqual(readTrailer(body(writes[0]))?.branch, BRANCH);
    assert.match(body(writes[0]), new RegExp(`\\*\\*Integration branch:\\*\\* \`${BRANCH}\``));
  });

  test("without --from the branch is cut from origin/main", async () => {
    const { clone } = scratch("");
    args(clone, "197");
    const r = await runCase("branch", clone);
    assert.equal(r.code, 0, r.stderr);
    assert.equal(git(clone, "rev-parse", "HEAD"), git(clone, "rev-parse", "origin/main"));
  });
});

describe("edge cases", () => {
  test("the branch exists locally: switches to it, pushes nothing, writes nothing new", async () => {
    const { clone, origin } = scratch("");
    args(clone, "197", "--from", "next");
    await runCase("branch", clone); // the first run creates it and records it in the plan
    git(clone, "switch", "-q", "main");
    writeFileSync(join(clone, "gh.json"), JSON.stringify({
      "issue view 197 --json title": { stdout: { title: TITLE } },
      [`api repos/{owner}/{repo}/issues/197/comments --paginate --jq ${JQ}`]: { stdout: planComment(BRANCH) },
    }));
    const before = git(origin, "rev-parse", BRANCH);
    const r = await runCase("branch", clone);
    assert.equal(r.code, 0, r.stderr);
    assert.equal(git(clone, "branch", "--show-current"), BRANCH);
    assert.equal(git(origin, "rev-parse", BRANCH), before);
    assert.deepEqual(r.writes, []);
  });

  test("the branch exists only on origin: a fresh clone switches to it and writes nothing", async () => {
    const { clone, origin } = scratch(planComment(BRANCH));
    git(origin, "branch", BRANCH, "next");
    args(clone, "197", "--from", "next");
    const r = await runCase("branch", clone);
    assert.equal(r.code, 0, r.stderr);
    assert.equal(git(clone, "branch", "--show-current"), BRANCH);
    assert.deepEqual(r.writes, []);
  });

  test("the branch exists but the plan never recorded it: the plan is written once", async () => {
    const { clone, origin } = scratch("");
    git(origin, "branch", BRANCH, "next");
    args(clone, "197");
    const r = await runCase("branch", clone);
    assert.equal(r.code, 0, r.stderr);
    assert.equal((r.writes as Write[]).length, 1);
    assert.equal(readTrailer(body((r.writes as Write[])[0]))?.branch, BRANCH);
  });

  test("a run that stopped after making the local branch pushes it on the next run", async () => {
    const { clone, origin } = scratch(planComment(BRANCH));
    git(clone, "branch", BRANCH, "origin/next");
    args(clone, "197", "--from", "next");
    const r = await runCase("branch", clone);
    assert.equal(r.code, 0, r.stderr);
    assert.equal(git(origin, "rev-parse", BRANCH), git(clone, "rev-parse", "origin/next"));
  });

  test("an unknown base exits 1 and writes nothing", async () => {
    const { clone } = scratch("");
    args(clone, "197", "--from", "nope");
    const r = await runCase("branch", clone);
    assert.equal(r.code, 1);
    assert.deepEqual(r.writes, []);
  });

  test("no epic argument exits 2 with usage", async () => {
    const { clone } = scratch("");
    args(clone);
    const r = await runCase("branch", clone);
    assert.equal(r.code, 2);
    assert.match(r.stderr, /usage: spp branch/);
  });
});
