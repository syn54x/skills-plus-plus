import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { runCase } from "./harness.ts";

const JQ = ".[] | [.id, .body, .user.login, .author_association] | @json";
const ROUTING = "# Project\n\n<!-- sdd-routing -->\n- Mode: org\n- Laws: CLAUDE.md, GLOSSARY.md, .agents/adr/\n<!-- /sdd-routing -->\n";
const trailer = (data: unknown) => `<!-- sdd-data: ${Buffer.from(JSON.stringify(data)).toString("base64")} -->`;
const plan = (data: unknown) => JSON.stringify([601, `<!-- sdd-plan -->\n## Plan\n${trailer(data)}\n`, "maint", "OWNER"]) + "\n";

// Markdown that a paraphrase or a template engine would mangle: a fence with shell syntax, a heading, a backslash, trailing spaces.
const BODY = [
  "## What to build",
  "",
  "Render `spp brief`.  ",
  "",
  "## Verify",
  "",
  "```bash",
  'node --test "$(pwd)/spp/test/brief.test.ts" \\',
  "  && echo 'done: ${HOME}'",
  "```",
  "",
  "## Blocked by",
  "",
  "- #201",
].join("\n");

type Opts = { claude?: string | null; parent?: boolean; planData?: unknown; extra?: string[]; title?: string; closed?: boolean };

// A case directory for ticket 12 in acme/app whose Epic 197 plan comment carries `planData`.
function scratch({ claude = ROUTING, parent = true, planData = { branch: "feat/invoices" }, extra = [], title = "Add the invoice endpoint!", closed = false }: Opts = {}) {
  const dir = mkdtempSync(join(tmpdir(), "spp-brief-"));
  const out = join(dir, "brief-12.md");
  if (claude !== null) writeFileSync(join(dir, "CLAUDE.md"), claude);
  const issue = { number: 12, title, url: "https://github.com/acme/app/issues/12", body: BODY, state: closed ? "CLOSED" : "OPEN", parent: parent ? { number: 197, url: "https://github.com/acme/app/issues/197" } : null };
  writeFileSync(
    join(dir, "gh.json"),
    JSON.stringify({
      "issue view 12 --json number,title,url,body,parent,state": { stdout: issue },
      [`api repos/acme/app/issues/197/comments --paginate --jq ${JQ}`]: { stdout: plan(planData) },
      "repo view acme/app --json defaultBranchRef --jq .defaultBranchRef.name": { stdout: "main\n" },
    }),
  );
  writeFileSync(join(dir, "args"), ["12", ...extra.map((e) => (e === "OUT" ? out : e))].join("\n") + "\n");
  return { dir, out };
}

describe("happy path", () => {
  test("spp brief 12 --out FILE writes ticket 12's body verbatim and the Laws sources, and prints the path", async () => {
    const { dir, out } = scratch({ extra: ["--out", "OUT"] });
    const r = await runCase("brief", dir);
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stdout, out + "\n");
    const brief = readFileSync(out, "utf8");
    assert.ok(brief.includes(`## Ticket (verbatim)\n\n${BODY}\n`), "the ticket body is in the brief exactly as filed");
    for (const law of ["CLAUDE.md", "GLOSSARY.md", ".agents/adr/"]) assert.ok(brief.includes(`- ${law}\n`), `Laws source ${law}`);
    assert.match(brief, /the epic .*issues\/197/i);
  });

  test("the branch mechanics name the integration branch, the sdd branch and the base check", async () => {
    const { dir, out } = scratch({ extra: ["--out", "OUT"] });
    await runCase("brief", dir);
    const brief = readFileSync(out, "utf8");
    assert.ok(brief.includes("git fetch origin feat/invoices\n"));
    assert.ok(brief.includes("git switch -c sdd/12-add-the-invoice-endpoint origin/feat/invoices\n"));
    assert.ok(brief.includes('test "$(git merge-base HEAD origin/feat/invoices)" = "$(git rev-parse origin/feat/invoices)"'));
    assert.match(brief, /PR into `feat\/invoices` with `Closes #12`/);
    assert.match(brief, /## Report/);
  });

  test("the first step asks origin whether the ticket's branch exists, and confirms the base after either arm", async () => {
    const { dir, out } = scratch({ extra: ["--out", "OUT"] });
    await runCase("brief", dir);
    const brief = readFileSync(out, "utf8");
    assert.ok(brief.includes("git ls-remote --exit-code --heads origin sdd/12-add-the-invoice-endpoint"));
    assert.ok(brief.includes("git switch -c sdd/12-add-the-invoice-endpoint origin/sdd/12-add-the-invoice-endpoint\n"));
    assert.ok(brief.indexOf("fi\n") < brief.indexOf('test "$(git merge-base HEAD origin/feat/invoices)"'), "the base check runs after both arms");
    assert.doesNotMatch(brief, /an earlier worker opened its pull request/);
  });

  test("the worker's name is t-<N>, the one its Agent description starts with, so the board can match it", async () => {
    const { dir, out } = scratch({ extra: ["--out", "OUT"] });
    await runCase("brief", dir);
    const brief = readFileSync(out, "utf8");
    assert.match(brief, /^You are t-12,/);
    assert.ok(brief.includes("spp progress 12 --worker t-12"), "the Worker line names t-12");
    assert.doesNotMatch(brief, /worker-12/);
    assert.doesNotMatch(brief, /spp wait/, "spp wait reads no worker name");
    assert.doesNotMatch(brief, /driver/i, "every worker is a subagent; there is no driver");
  });

  test("the report asks for implement-issue's one fenced JSON object, not a prose report", async () => {
    const { dir, out } = scratch({ extra: ["--out", "OUT"] });
    await runCase("brief", dir);
    const report = readFileSync(out, "utf8").split("## Report\n")[1];
    assert.match(report, /one fenced JSON object/);
    assert.match(report, /"ticket"/);
    assert.match(report, /"verifySha"/);
    assert.doesNotMatch(report, /Reply in 200 words/);
  });

  test("without --out the brief goes to a temp file whose path is printed", async () => {
    const { dir } = scratch();
    const r = await runCase("brief", dir);
    assert.equal(r.code, 0, r.stderr);
    const path = r.stdout.trim();
    assert.ok(existsSync(path), path);
    assert.ok(readFileSync(path, "utf8").includes(BODY));
  });
});

describe("edge cases", () => {
  test("a ticket with no parent targets the repo's default branch", async () => {
    const { dir, out } = scratch({ parent: false, extra: ["--out", "OUT"] });
    const r = await runCase("brief", dir);
    assert.equal(r.code, 0, r.stderr);
    const brief = readFileSync(out, "utf8");
    assert.ok(brief.includes("git switch -c sdd/12-add-the-invoice-endpoint origin/main\n"));
    assert.match(brief, /PR into `main` with `Closes #12`/);
  });

  test("the body is never altered even when it carries sdd markers and template-looking text", async () => {
    const { dir, out } = scratch({ extra: ["--out", "OUT"] });
    await runCase("brief", dir);
    assert.equal(readFileSync(out, "utf8").split("## Ticket (verbatim)\n\n")[1].startsWith(BODY), true);
  });
});

describe("error path", () => {
  test("an Epic whose plan comment names no integration branch exits 1 with the fix: run spp branch 197", async () => {
    const { dir } = scratch({ planData: { goal: "g" }, extra: ["--out", "OUT"] });
    const r = await runCase("brief", dir);
    assert.equal(r.code, 1);
    assert.match(r.stderr, /spp branch 197/);
  });

  test("no Routing block exits 1 with the fix: run /setup-spp", async () => {
    const { dir, out } = scratch({ claude: null, extra: ["--out", "OUT"] });
    const r = await runCase("brief", dir);
    assert.equal(r.code, 1);
    assert.match(r.stderr, /\/setup-spp/);
    assert.equal(existsSync(out), false);
  });

  test("no issue argument exits 2 with usage", async () => {
    const dir = mkdtempSync(join(tmpdir(), "spp-brief-"));
    writeFileSync(join(dir, "args"), "");
    const r = await runCase("brief", dir);
    assert.equal(r.code, 2);
    assert.match(r.stderr, /usage: spp brief/);
  });
});

// R2-F8 on #430: the brief's first step, run for real against an origin. The pushed branch is brought onto the base,
// and an origin that cannot be reached stops the worker instead of reading as "no pushed branch".
describe("the first step, run", () => {
  const BRANCH = "sdd/12-add-the-invoice-endpoint";
  const BASE = "feat/invoices";
  const env = { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@x", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@x", GIT_CONFIG_GLOBAL: "/dev/null" };
  const git = (cwd: string, ...args: string[]) => {
    const r = spawnSync("git", args, { cwd, env, encoding: "utf8" });
    assert.equal(r.status, 0, `git ${args.join(" ")}: ${r.stderr}`);
    return r.stdout.trim();
  };
  const commit = (cwd: string, file: string, text: string) => {
    writeFileSync(join(cwd, file), text);
    git(cwd, "add", file);
    git(cwd, "commit", "-qm", file);
    return git(cwd, "rev-parse", "HEAD");
  };

  // An origin whose base has moved on since `pushed` (when given) was cut from it, and a fresh clone to run the step in.
  async function setup(pushed?: { file: string; text: string }, closed = false) {
    const root = mkdtempSync(join(tmpdir(), "spp-brief-git-"));
    const origin = join(root, "origin.git");
    const seed = join(root, "seed");
    git(root, "init", "-q", "--bare", "-b", "main", origin);
    git(root, "clone", "-q", origin, seed);
    commit(seed, "a.txt", "a\n");
    git(seed, "push", "-q", "origin", `HEAD:${BASE}`, "HEAD:main");
    let work: string | undefined;
    if (pushed) {
      git(seed, "switch", "-qc", BRANCH);
      work = commit(seed, pushed.file, pushed.text);
      git(seed, "push", "-q", "origin", BRANCH);
      git(seed, "switch", "-q", "--detach", `origin/${BASE}`);
    }
    const base = commit(seed, "b.txt", "b\n");
    git(seed, "push", "-q", "origin", `HEAD:${BASE}`);
    const checkout = join(root, "checkout");
    git(root, "clone", "-q", origin, checkout);
    const { dir, out } = scratch({ extra: ["--out", "OUT"], closed });
    await runCase("brief", dir);
    const step = /\n\n((?: {4}.*\n)+)\n/.exec(readFileSync(out, "utf8"))![1].replace(/^ {4}/gm, "");
    const run = () => spawnSync("bash", ["-c", step], { cwd: checkout, env, encoding: "utf8" });
    return { checkout, origin, base, work, run };
  }

  test("a pushed branch cut from an older base is rebased onto the base, its commit kept", async () => {
    const { checkout, base, run } = await setup({ file: "c.txt", text: "c\n" });
    const r = run();
    assert.equal(r.status, 0, r.stderr);
    assert.equal(git(checkout, "branch", "--show-current"), BRANCH);
    assert.equal(git(checkout, "merge-base", "HEAD", `origin/${BASE}`), base);
    assert.equal(readFileSync(join(checkout, "c.txt"), "utf8"), "c\n");
  });

  test("no pushed branch: a new one is cut from the base", async () => {
    const { checkout, base, run } = await setup();
    const r = run();
    assert.equal(r.status, 0, r.stderr);
    assert.equal(git(checkout, "branch", "--show-current"), BRANCH);
    assert.equal(git(checkout, "rev-parse", "HEAD"), base);
  });

  test("an origin that cannot be reached stops the step, and no branch is cut", async () => {
    const { checkout, run } = await setup({ file: "c.txt", text: "c\n" });
    git(checkout, "remote", "set-url", "origin", join(checkout, "nowhere.git"));
    const r = run();
    assert.notEqual(r.status, 0);
    assert.equal(spawnSync("git", ["rev-parse", "--verify", "-q", BRANCH], { cwd: checkout, env }).status, 1);
  });

  test("a pushed branch whose rebase conflicts with the base stops the step, with no rebase left in progress", async () => {
    const { checkout, run } = await setup({ file: "b.txt", text: "not b\n" });
    assert.notEqual(run().status, 0);
    assert.equal(git(checkout, "status", "--porcelain"), "");
    assert.equal(existsSync(join(checkout, ".git", "rebase-merge")) || existsSync(join(checkout, ".git", "rebase-apply")), false);
  });

  // The quality gate on #433: a closed ticket's own branch merged (squashed, so not an ancestor of the base) and may
  // still be on origin; a fresh worker for a fix pull request must not rebase it.
  test("a closed ticket ignores its own pushed branch and cuts a new one from the base", async () => {
    const { checkout, base, run } = await setup({ file: "b.txt", text: "not b\n" }, true);
    const r = run();
    assert.equal(r.status, 0, r.stderr);
    assert.equal(git(checkout, "branch", "--show-current"), BRANCH);
    assert.equal(git(checkout, "rev-parse", "HEAD"), base);
  });
});
