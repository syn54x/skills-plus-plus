import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { runCase } from "./harness.ts";

const JQ = ".[] | [.id, .body] | @json";
const ROUTING = "# Project\n\n<!-- sdd-routing -->\n- Mode: org\n- Laws: CLAUDE.md, GLOSSARY.md, .agents/adr/\n<!-- /sdd-routing -->\n";
const trailer = (data: unknown) => `<!-- sdd-data: ${Buffer.from(JSON.stringify(data)).toString("base64")} -->`;
const plan = (data: unknown) => JSON.stringify([601, `<!-- sdd-plan -->\n## Plan\n${trailer(data)}\n`]) + "\n";

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

  test("the worker's name is t-<N>, the name the drivers give its session, so the board can match it", async () => {
    const { dir, out } = scratch({ extra: ["--out", "OUT"] });
    await runCase("brief", dir);
    const brief = readFileSync(out, "utf8");
    assert.match(brief, /^You are t-12,/);
    assert.ok(brief.includes("spp progress 12 --worker t-12"), "the Worker line names t-12");
    assert.doesNotMatch(brief, /worker-12/);
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
