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

type Opts = { claude?: string | null; parent?: boolean; planData?: unknown; extra?: string[]; title?: string };

// A case directory for ticket 12 in acme/app whose Epic 197 plan comment carries `planData`.
function scratch({ claude = ROUTING, parent = true, planData = { branch: "feat/invoices" }, extra = [], title = "Add the invoice endpoint!" }: Opts = {}) {
  const dir = mkdtempSync(join(tmpdir(), "spp-brief-"));
  const out = join(dir, "brief-12.md");
  if (claude !== null) writeFileSync(join(dir, "CLAUDE.md"), claude);
  const issue = { number: 12, title, url: "https://github.com/acme/app/issues/12", body: BODY, parent: parent ? { number: 197, url: "https://github.com/acme/app/issues/197" } : null };
  writeFileSync(
    join(dir, "gh.json"),
    JSON.stringify({
      "issue view 12 --json number,title,url,body,parent": { stdout: issue },
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

// R4-F5 on #430: a worker never takes an existing branch, and never pushes over one. Run for real against a bare
// origin: git ls-remote --exit-code decides, exit 2 (no such branch) cuts it, exit 0 (pushed) or any other stops.
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
  // An origin with the base branch, optionally the ticket branch already pushed, and a fresh clone of it.
  const setup = (pushed: boolean) => {
    const root = mkdtempSync(join(tmpdir(), "spp-brief-git-"));
    const origin = join(root, "origin.git");
    const seed = join(root, "seed");
    git(root, "init", "-q", "--bare", "-b", "main", origin);
    git(root, "clone", "-q", origin, seed);
    const base = commit(seed, "a.txt", "a\n");
    git(seed, "push", "-q", "origin", `HEAD:${BASE}`, "HEAD:main");
    if (pushed) {
      git(seed, "switch", "-qc", BRANCH);
      commit(seed, "c.txt", "c\n");
      git(seed, "push", "-q", "origin", BRANCH);
    }
    const checkout = join(root, "checkout");
    git(root, "clone", "-q", origin, checkout);
    return { root, origin, checkout, base };
  };
  const step = async () => {
    const { dir, out } = scratch({ extra: ["--out", "OUT"] });
    await runCase("brief", dir);
    return /\n\n((?: {4}.*\n)+)\n/.exec(readFileSync(out, "utf8"))![1].replace(/^ {4}/gm, "");
  };
  const run = (s: string, cwd: string) => spawnSync("bash", ["-c", s], { cwd, env, encoding: "utf8" });

  test("ls-remote exit 2, no such branch on origin: it cuts sdd/<N>-<slug> from the base and confirms the base", async () => {
    const { checkout, base } = setup(false);
    const s = await step();
    assert.match(s, /git ls-remote --exit-code --heads origin refs\/heads\/sdd\/12-add-the-invoice-endpoint/);
    assert.match(s, /test "\$\(git merge-base HEAD origin\/feat\/invoices\)" = "\$\(git rev-parse origin\/feat\/invoices\)"/);
    const r = run(s, checkout);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(git(checkout, "branch", "--show-current"), BRANCH);
    assert.equal(git(checkout, "rev-parse", "HEAD"), base);

    // A switch that fails (the branch already exists here) stops the step, though the base check alone would pass.
    git(checkout, "switch", "-q", "--detach", `origin/${BASE}`);
    assert.notEqual(run(s, checkout).status, 0, "a failed switch stops the step");
  });

  test("a branch on origin that only ends with the ticket branch's name (backup/sdd/...) is not the ticket branch: it cuts", async () => {
    const { root, origin, checkout, base } = setup(false);
    const other = join(root, "other");
    git(root, "clone", "-q", origin, other);
    git(other, "push", "-q", "origin", `HEAD:backup/${BRANCH}`);
    const r = run(await step(), checkout);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(git(checkout, "branch", "--show-current"), BRANCH);
    assert.equal(git(checkout, "rev-parse", "HEAD"), base);
  });

  test("ls-remote exit 0, origin already has the branch: BLOCKED, no branch cut, the pushed commits untouched", async () => {
    const { origin, checkout } = setup(true);
    const before = git(origin, "rev-parse", BRANCH);
    const r = run(await step(), checkout);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /BLOCKED: origin already has sdd\/12-add-the-invoice-endpoint; delete it or hand the issue back/);
    assert.notEqual(git(checkout, "branch", "--show-current"), BRANCH);
    assert.equal(git(origin, "rev-parse", BRANCH), before);
  });

  test("ls-remote any other exit, origin unreachable: BLOCKED as an unreachable origin, no branch cut", async () => {
    const { root, checkout } = setup(false);
    git(checkout, "remote", "set-url", "origin", join(root, "gone.git"));
    const r = run(await step(), checkout);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /BLOCKED: origin is unreachable/);
    assert.notEqual(git(checkout, "branch", "--show-current"), BRANCH);
  });

  test("the brief says a worker never force-pushes", async () => {
    const { dir, out } = scratch({ extra: ["--out", "OUT"] });
    await runCase("brief", dir);
    assert.match(readFileSync(out, "utf8"), /Never force-push/);
  });
});
