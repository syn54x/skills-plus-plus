import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { mergeFindings, panelVerdict, parsePersonaFindings, type PersonaFindings, type Readings, type Severity } from "../src/findings.ts";
import { runsFile, signalsFile } from "../src/signals.ts";
import { assertCase, runCase } from "./harness.ts";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => join(here, "fixtures", "findings", name);

describe("happy path", () => {
  test("two personas naming the same file at lines 10 and 12 with the same title give one finding with both personas", async () => {
    await assertCase("findings", fixture("duplicate-window")); // expected.json holds the whole output
  });

  test("duplicates at important and critical merge as critical, with the critical copy's line and body", async () => {
    await assertCase("findings", fixture("severity-wins"));
  });

  test("running the merge twice on the same files prints identical output", async () => {
    const a = await runCase("findings", fixture("order-a"));
    const b = await runCase("findings", fixture("order-a"));
    assert.equal(a.code, 0, a.stderr);
    assert.equal(a.stdout, b.stdout);
  });

  test("the same files named in another order print the same findings and ids", async () => {
    const a = await assertCase("findings", fixture("order-a"));
    const b = await assertCase("findings", fixture("order-b"));
    assert.equal(a.stdout, b.stdout);
  });

  test("the text view prints one block per finding, then the counts and the dropped count", async () => {
    await assertCase("findings", fixture("text")); // expected.txt
  });
});

describe("edge cases", () => {
  test("the same title at lines 10 and 30 gives two findings", async () => {
    await assertCase("findings", fixture("far-apart"));
  });

  test("a finding at confidence 70 is dropped and one at 80 stays", async () => {
    await assertCase("findings", fixture("low-confidence"));
  });
});

// One Persona's reply with a single finding on src/a.ts.
const at = (persona: string, line: number, title: string, severity: Severity = "important"): PersonaFindings => ({
  persona,
  findings: [{ file: "src/a.ts", line, title, severity, confidence: 90, body: "b" }],
});

describe("near titles", () => {
  test("two Personas titling one defect differently, at lines 10 and 12, give one finding that lists the title that did not speak", async () => {
    const r = await assertCase("findings", fixture("near-titles")); // expected.json holds the whole output, and no `lines` key
    assert.deepEqual((r.json as { counts: { severity: unknown } }).counts.severity, { critical: 0, important: 1, minor: 0 });
  });

  test("findings at lines 10, 12 and 14 are one finding listing two other titles, and a fourth at line 15 is a second finding", () => {
    const r = mergeFindings([at("a", 10, "first"), at("b", 12, "second"), at("c", 14, "third"), at("d", 15, "fourth")]);
    assert.equal(r.findings.length, 2);
    const [one, two] = r.findings;
    assert.deepEqual(one.personas, ["a", "b", "c"]);
    assert.equal(one.body, "b\n\nAlso reported as: second (b, line 12)\nAlso reported as: third (c, line 14)");
    assert.deepEqual(two.personas, ["d"]);
    assert.equal(two.body, "b");
    assert.deepEqual(r.lines, { F1: [10, 12, 14], F2: [15] });
  });

  test("a title two Personas share is listed once, and the title that speaks is never listed", () => {
    const r = mergeFindings([at("correctness", 10, "Same title"), at("testing", 10, "same title!"), at("adversarial", 12, "Other defect")]);
    assert.equal(r.findings.length, 1);
    assert.equal(r.findings[0].title, "Other defect"); // equal severity and confidence: the first Persona by name speaks
    assert.equal(r.findings[0].body, "b\n\nAlso reported as: Same title (correctness, line 10)");
    assert.deepEqual(r.lines, { F1: [10, 12] });
  });

  test("a tagged title merges only with its own tag, matched case-insensitively, and never with an untagged one", () => {
    for (const [one, other] of [["ticket-mandated: retry", "Ticket-Mandated: log"], ["Candidate ADR: sqlite", "candidate adr: postgres"], ["Check after deploy: queue", "check after deploy: cache"], ["Terminology: gate", "terminology drift in the docs"]]) {
      assert.equal(mergeFindings([at("a", 10, one), at("b", 11, other)]).findings.length, 1, `${one} with ${other}`);
      assert.equal(mergeFindings([at("a", 10, one), at("b", 11, "an untagged defect")]).findings.length, 2, `${one} with an untagged title`);
    }
    assert.equal(mergeFindings([at("a", 10, "Candidate ADR: sqlite"), at("b", 11, "ticket-mandated: retry")]).findings.length, 2);
  });

  test("a ticket-mandated finding beside a real defect on the next line stays two findings, and the verdict is FIX FIRST", () => {
    const result = mergeFindings([at("correctness", 10, "ticket-mandated: retry on every call", "critical"), at("testing", 11, "real defect", "critical")]);
    assert.equal(result.findings.length, 2);
    assert.equal(panelVerdict(result, { round: 1, spec: "pass", coherence: "pass", verify: "pass", checks: "pass", missing: [] }), "FIX FIRST");
  });

  test("a recheck- input merged with another Persona's differently titled finding is listed once in recheck", () => {
    const recheck = at("correctness", 10, "old defect");
    const r = mergeFindings([recheck, at("testing", 11, "same defect, other words")], new Set([recheck]));
    assert.equal(r.findings.length, 1);
    assert.deepEqual(r.recheck, ["F1"]);
    assert.deepEqual(r.lines, { F1: [10, 11] });
  });
});

describe("error paths", () => {
  test("a file that is not JSON exits 1 and names the file", async () => {
    const r = await assertCase("findings", fixture("bad-json"), 1);
    assert.match(r.stderr, /broken\.json/);
  });

  test("a finding with a severity outside critical, important, minor exits 1 and names the file", async () => {
    const r = await assertCase("findings", fixture("bad-finding"), 1);
    assert.match(r.stderr, /bad\.json/);
    assert.match(r.stderr, /severity/);
  });

  test("a file that does not exist exits 1 and names the file", async () => {
    const r = await assertCase("findings", fixture("missing-file"), 1);
    assert.match(r.stderr, /nope\.json/);
  });

  test("no files exits 2 with usage", async () => {
    const r = await assertCase("findings", fixture("no-files"), 2);
    assert.match(r.stderr, /usage: spp findings merge/);
  });
});

// --verdict: the panel's verdict from VERDICT.md's first-row-wins table, computed from the merged findings and the readings.
const one = (severity: string, title = "t", persona = "correctness") => ({ persona, findings: [{ file: "src/a.ts", line: 1, title, severity, confidence: 90, body: "b" }] });
const green: Readings = { round: 1, spec: "pass", coherence: "pass", verify: "pass", checks: "pass", missing: [] };

describe("verdict", () => {
  const verdictOf = (inputs: { persona: string; findings: unknown[] }[], readings: Partial<Readings> = {}) =>
    panelVerdict(mergeFindings(inputs.map((i) => parsePersonaFindings(i, "test"))), { ...green, ...readings });

  test("no findings, or only a minor one, with every reading green is MERGE, and no checks configured changes nothing", () => {
    assert.equal(verdictOf([]), "MERGE");
    assert.equal(verdictOf([one("minor")]), "MERGE");
    assert.equal(verdictOf([], { checks: "none" }), "MERGE");
  });

  test("a critical finding is FIX FIRST", () => {
    assert.equal(verdictOf([one("critical")]), "FIX FIRST");
  });

  test("a failed spec, coherence, verify or check, or a persona that did not report, is FIX FIRST on its own", () => {
    for (const readings of [{ spec: "fail" }, { coherence: "fail" }, { verify: "fail" }, { checks: "fail" }, { missing: ["security"] }] as Partial<Readings>[])
      assert.equal(verdictOf([], readings), "FIX FIRST", JSON.stringify(readings));
  });

  test("an important finding, or a pending check, with nothing in the first row is HUMAN DECISION", () => {
    assert.equal(verdictOf([one("important")]), "HUMAN DECISION");
    assert.equal(verdictOf([], { checks: "pending" }), "HUMAN DECISION");
  });

  test("the first row wins: a critical finding beside an important one and a pending check is FIX FIRST", () => {
    assert.equal(verdictOf([one("critical"), one("important", "other")], { checks: "pending" }), "FIX FIRST");
  });

  test("a ticket-mandated finding is HUMAN DECISION whatever its severity, since the ticket asked for it", () => {
    assert.equal(verdictOf([one("critical", "ticket-mandated: retry on every call")]), "HUMAN DECISION");
    assert.equal(verdictOf([one("minor", "Ticket-mandated: retry on every call")]), "HUMAN DECISION");
    assert.equal(verdictOf([one("critical", "ticket-mandated: x"), one("critical", "real defect")]), "FIX FIRST");
  });

  test("from round 3 a FIX FIRST is written HUMAN DECISION, and a MERGE stays MERGE", () => {
    assert.equal(verdictOf([one("critical")], { round: 2 }), "FIX FIRST");
    assert.equal(verdictOf([one("critical")], { round: 3 }), "HUMAN DECISION");
    assert.equal(verdictOf([], { round: 4, verify: "fail" }), "HUMAN DECISION");
    assert.equal(verdictOf([], { round: 3 }), "MERGE");
  });

  test("the same findings in a different order give the same verdict", () => {
    const a = [one("important", "x", "testing"), one("minor", "y", "history")];
    assert.equal(verdictOf(a), verdictOf([...a].reverse()));
  });
});

describe("verdict flags", () => {
  // A case directory made on the spot: its args file, and one persona file with a single finding of the given severity.
  function caseDir(args: string[], severity = "important"): string {
    const dir = mkdtempSync(join(tmpdir(), "spp-verdict-"));
    writeFileSync(join(dir, "args"), args.join("\n") + "\n");
    writeFileSync(join(dir, "a.json"), JSON.stringify(one(severity)));
    return dir;
  }
  const readings = ["--spec", "pass", "--coherence", "pass", "--verify", "pass", "--checks", "pass"];

  test("the text view ends with a Verdict line", async () => {
    const r = await runCase("findings", caseDir(["merge", "--verdict", "1", ...readings, "a.json"]));
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stdout.trimEnd().split("\n").at(-1), "Verdict: HUMAN DECISION");
  });

  test("--json adds the verdict to the output", async () => {
    const r = await runCase("findings", caseDir(["merge", "--json", "--verdict", "1", ...readings, "--missing", "security,reliability", "a.json"]));
    assert.equal(r.code, 0, r.stderr);
    assert.equal((r.json as { verdict: string }).verdict, "FIX FIRST");
  });

  test("without --verdict the output is unchanged", async () => {
    const r = await runCase("findings", caseDir(["merge", "a.json"]));
    assert.doesNotMatch(r.stdout, /Verdict/);
  });

  test("--verdict without a reading exits 2 and names it", async () => {
    const r = await runCase("findings", caseDir(["merge", "--verdict", "1", "--spec", "pass", "a.json"]));
    assert.equal(r.code, 2);
    assert.match(r.stderr, /--coherence/);
  });

  test("a bad round or reading exits 2", async () => {
    for (const bad of [["--verdict", "0", ...readings], ["--verdict", "x", ...readings], ["--verdict", "1", ...readings.slice(2), "--spec", "maybe"]]) {
      const r = await runCase("findings", caseDir(["merge", ...bad, "a.json"]));
      assert.equal(r.code, 2, bad.join(" "));
    }
  });
});

describe("--fix-diff", () => {
  const PATCH = [
    "diff --git a/src/a.ts b/src/a.ts",
    "--- a/src/a.ts",
    "+++ b/src/a.ts",
    "@@ -10,4 +10,4 @@",
    " context ten",
    "-old eleven",
    "+new eleven",
    " context twelve",
    "+added thirteen",
    "-old fourteen",
    "diff --git a/src/gone.ts b/src/gone.ts",
    "--- a/src/gone.ts",
    "+++ /dev/null",
    "@@ -1,2 +0,0 @@",
    "-x",
    "-y",
    "",
  ].join("\n");
  const finding = (file: string, line: number) => ({ file, line, title: `problem at ${line}`, severity: "important", confidence: 90, body: "b" });

  // A checkout, its findings files and the patch, in one temp directory.
  function setup(files: Record<string, unknown[]>, mode: string | null = "Anonymous") {
    const dir = mkdtempSync(join(tmpdir(), "spp-fixdiff-"));
    const state = join(dir, ".state");
    spawnSync("git", ["init", "-q"], { cwd: dir });
    spawnSync("git", ["remote", "add", "origin", "https://github.com/acme/app.git"], { cwd: dir });
    const line = mode === null ? "" : `- Self-improvement mode: ${mode}\n`;
    writeFileSync(join(dir, "CLAUDE.md"), `# app\n\n<!-- sdd-routing -->\n- Mode: org\n${line}<!-- /sdd-routing -->\n`);
    writeFileSync(join(dir, "fix-2.patch"), PATCH);
    for (const [name, findings] of Object.entries(files)) writeFileSync(join(dir, name), JSON.stringify({ persona: name.replace(/^(persona|recheck)-|\.json$/g, ""), findings }));
    return { dir, state, log: signalsFile({ XDG_STATE_HOME: state, HOME: dir }, "acme/app") };
  }
  function merge(c: { dir: string; state: string }, args: string[], env: Record<string, string> = { CLAUDE_CODE_SESSION_ATTENDED: "1" }) {
    const base: NodeJS.ProcessEnv = { ...process.env, XDG_STATE_HOME: c.state, HOME: c.dir };
    delete base.CI;
    delete base.CLAUDE_CODE_SESSION_ATTENDED;
    const r = spawnSync(process.execPath, [join(here, "..", "..", "bin", "spp"), "findings", "merge", ...args], { cwd: c.dir, encoding: "utf8", env: { ...base, ...env } });
    return { code: r.status, stdout: r.stdout, stderr: r.stderr };
  }
  const signals = (log: string) => (existsSync(log) ? readFileSync(log, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as Record<string, string>) : []);

  test("a finding on a + line records one fix-regression Signal and prints it on stderr", () => {
    const c = setup({ "persona-correctness.json": [finding("src/a.ts", 11)] });
    const r = merge(c, ["persona-correctness.json", "--fix-diff", "fix-2.patch"]);
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stderr, "fix-regression F1 recorded\n");
    const [s, ...rest] = signals(c.log);
    assert.deepEqual(rest, []);
    assert.deepEqual([s.category, s.skill, s.step], ["fix-regression", "implement-issue", "fix round"]);
    assert.equal(s.evidence, "F1 src/a.ts:11 is on a line fix-2.patch changed: problem at 11");
  });

  // R2-F5: a second merge of the same round counted the run again while its regressions were deduped.
  // PR #390 review: the round counter resets on a fresh panel run, so the run is named by the patch's content.
  test("a fix round's run is named by its patch's content: the same patch twice is one run, another patch under the same name a second; CI and Off record none", () => {
    const c = setup({ "persona-correctness.json": [finding("src/other.ts", 1)] });
    const runs = () => signals(runsFile({ XDG_STATE_HOME: c.state, HOME: c.dir }, "acme/app"));
    const hash = (text: string) => createHash("sha256").update(text).digest("hex").slice(0, 12);
    merge(c, ["persona-correctness.json", "--fix-diff", "fix-2.patch"]);
    assert.deepEqual(runs().map((r) => [r.skill, r.step, r.artifact]), [["implement-issue", "fix round", `fix diff ${hash(PATCH)}`]]);
    merge(c, ["persona-correctness.json", "--fix-diff", "fix-2.patch", "--json"]);
    writeFileSync(join(c.dir, "fix-3.patch"), PATCH);
    merge(c, ["persona-correctness.json", "--fix-diff", "fix-3.patch"]);
    assert.equal(runs().length, 1);
    // A fresh panel run on the same pull request writes round 1's patch again, with other fixes in it.
    mkdirSync(join(c.dir, "spp-panel-9"));
    const second = PATCH + "--- a/src/b.ts\n+++ b/src/b.ts\n@@ -1 +1 @@\n-x\n+y\n";
    writeFileSync(join(c.dir, "spp-panel-9", "fix-2.patch"), second);
    merge(c, ["persona-correctness.json", "--fix-diff", "spp-panel-9/fix-2.patch"]);
    assert.deepEqual(runs().map((r) => r.artifact), [`fix diff ${hash(PATCH)}`, `pull request 9 fix diff ${hash(second)}`]);
    merge(c, ["persona-correctness.json"]);
    assert.equal(runs().length, 2);
    writeFileSync(join(c.dir, "fix-4.patch"), PATCH + "\n");
    merge(c, ["persona-correctness.json", "--fix-diff", "fix-4.patch"], { CLAUDE_CODE_SESSION_ATTENDED: "1", CI: "true" });
    assert.equal(runs().length, 2);
    const off = setup({ "persona-correctness.json": [] }, "Off");
    merge(off, ["persona-correctness.json", "--fix-diff", "fix-2.patch"]);
    assert.equal(signals(runsFile({ XDG_STATE_HOME: off.state, HOME: off.dir }, "acme/app")).length, 0);
  });

  // A merged finding stands on every line its findings sat on, so a context-line speaker cannot hide a neighbour on a + line.
  test("a merged finding that speaks from a context line and absorbed one on a + line records one Signal naming the + line", () => {
    const c = setup({
      "persona-correctness.json": [{ ...finding("src/a.ts", 10), title: "retry is unbounded", severity: "critical" }],
      "persona-testing.json": [{ ...finding("src/a.ts", 11), title: "no test covers the retry" }],
    });
    const r = merge(c, ["persona-correctness.json", "persona-testing.json", "--fix-diff", "fix-2.patch"]);
    assert.equal(r.stderr, "fix-regression F1 recorded\n");
    const [s, ...rest] = signals(c.log);
    assert.deepEqual(rest, []);
    assert.match(s.evidence, /^F1 src\/a\.ts:11 is on a line fix-2\.patch changed: retry is unbounded$/);
  });

  test("a recheck- finding merged with another Persona's differently titled finding on a changed line records nothing", () => {
    const c = setup({
      "recheck-correctness.json": [{ ...finding("src/a.ts", 10), title: "retry is unbounded" }],
      "persona-testing.json": [{ ...finding("src/a.ts", 11), title: "no test covers the retry" }],
    });
    const r = merge(c, ["recheck-correctness.json", "persona-testing.json", "--fix-diff", "fix-2.patch"]);
    assert.equal(r.stderr, "");
    assert.deepEqual(signals(c.log), []);
  });

  test("two regressed findings give two Signals with one fingerprint", () => {
    const c = setup({ "persona-correctness.json": [finding("src/a.ts", 11), finding("src/b.ts", 1)] });
    writeFileSync(join(c.dir, "fix-2.patch"), PATCH + "--- a/src/b.ts\n+++ b/src/b.ts\n@@ -1 +1 @@\n-x\n+y\n"); // src/b.ts line 1 is a + line too
    const r = merge(c, ["persona-correctness.json", "--fix-diff", "fix-2.patch"]);
    assert.equal(r.stderr, "fix-regression F1 recorded\nfix-regression F2 recorded\n");
    const s = signals(c.log);
    assert.equal(s.length, 2);
    assert.equal(s[0].fingerprint, s[1].fingerprint);
  });

  test("context lines, a - line's old number, untouched files and deleted files record nothing", () => {
    const c = setup({ "persona-correctness.json": [finding("src/a.ts", 10), finding("src/a.ts", 12), finding("src/a.ts", 14), finding("src/other.ts", 11), finding("src/gone.ts", 1)] });
    const r = merge(c, ["persona-correctness.json", "--fix-diff", "fix-2.patch"]);
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stderr, "");
    assert.deepEqual(signals(c.log), []);
  });

  test("a recheck- finding merged into a changed-line finding is not a regression", () => {
    const f = finding("src/a.ts", 11);
    const c = setup({ "recheck-correctness.json": [f], "persona-correctness.json": [f] });
    const r = merge(c, ["recheck-correctness.json", "persona-correctness.json", "--fix-diff", "fix-2.patch"]);
    assert.equal(r.stderr, "");
    assert.deepEqual(signals(c.log), []);
    assert.equal(merge(c, ["recheck-correctness.json", "--fix-diff", "fix-2.patch"]).stderr, "");
  });

  test("CI and mode Off are reported as not recorded, and CI writes no log", () => {
    const c = setup({ "persona-correctness.json": [finding("src/a.ts", 11)] });
    const ci = merge(c, ["persona-correctness.json", "--fix-diff", "fix-2.patch"], { CLAUDE_CODE_SESSION_ATTENDED: "1", CI: "true" });
    assert.equal(ci.stderr, "fix-regression F1 not recorded: CI\n");
    assert.equal(existsSync(c.log), false);
    const off = setup({ "persona-correctness.json": [finding("src/a.ts", 11)] }, "Off");
    assert.equal(merge(off, ["persona-correctness.json", "--fix-diff", "fix-2.patch"]).stderr, "fix-regression F1 not recorded: Self-improvement mode is Off\n");
  });

  test("stdout is byte-identical with and without --fix-diff, including --json --verdict", () => {
    const c = setup({ "persona-correctness.json": [finding("src/a.ts", 11)] });
    const base = ["persona-correctness.json", "--json", "--verdict", "2", "--spec", "pass", "--coherence", "pass", "--verify", "pass", "--checks", "pass"];
    const a = merge(c, base);
    const b = merge(c, [...base, "--fix-diff", "fix-2.patch"]);
    assert.equal(b.code, 0);
    assert.equal(b.stdout, a.stdout);
    const t = merge(c, ["persona-correctness.json", "--fix-diff", "fix-2.patch"]);
    assert.equal(t.stdout, merge(c, ["persona-correctness.json"]).stdout);
  });

  test("no GitHub origin: not recorded with the reason, stdout unchanged, exit 0", () => {
    const c = setup({ "persona-correctness.json": [finding("src/a.ts", 11)] });
    spawnSync("git", ["remote", "remove", "origin"], { cwd: c.dir });
    const r = merge(c, ["persona-correctness.json", "--fix-diff", "fix-2.patch"]);
    assert.equal(r.code, 0);
    assert.match(r.stderr, /^fix-regression F1 not recorded: cannot tell this checkout's GitHub repository/);
    assert.equal(r.stdout, merge(c, ["persona-correctness.json"]).stdout);
  });

  test("a path git quotes (non-ASCII) is unquoted, so its findings record a Signal", () => {
    const c = setup({ "persona-correctness.json": [finding("src/café.ts", 1)] });
    writeFileSync(join(c.dir, "fix-2.patch"), '--- a/src/caf\\303\\251.ts\n+++ "b/src/caf\\303\\251.ts"\n@@ -1 +1 @@\n-a\n+b\n');
    const r = merge(c, ["persona-correctness.json", "--fix-diff", "fix-2.patch"]);
    assert.equal(r.stderr, "fix-regression F1 recorded\n");
  });

  test("a Signal write that fails is reported as not recorded and the exit code stays 0", () => {
    const c = setup({ "persona-correctness.json": [finding("src/a.ts", 11)] });
    writeFileSync(join(c.dir, "blocker"), "x");
    const r = merge({ dir: c.dir, state: join(c.dir, "blocker") }, ["persona-correctness.json", "--fix-diff", "fix-2.patch"]);
    assert.equal(r.code, 0, r.stderr);
    assert.match(r.stderr, /^fix-regression F1 not recorded: .+\n$/);
    assert.equal(r.stdout, merge(c, ["persona-correctness.json"]).stdout);
  });

  test("a log that cannot be written: same exit code and stdout as mode Off, one not recorded line on stderr", () => {
    const files = { "persona-correctness.json": [finding("src/a.ts", 11)] };
    const c = setup(files);
    writeFileSync(join(c.dir, "blocker"), "x");
    const args = ["persona-correctness.json", "--fix-diff", "fix-2.patch"];
    const r = merge({ dir: c.dir, state: join(c.dir, "blocker", "state") }, args);
    const off = merge(setup(files, "Off"), args);
    assert.deepEqual([r.code, r.stdout], [off.code, off.stdout]);
    assert.match(r.stderr, /^fix-regression F1 not recorded: .*(ENOTDIR|EEXIST).*\n$/);
  });

  test("an unreadable --fix-diff file exits 1 naming it, with nothing on stdout", () => {
    const c = setup({ "persona-correctness.json": [finding("src/a.ts", 11)] });
    const r = merge(c, ["persona-correctness.json", "--fix-diff", "missing.patch"]);
    assert.equal(r.code, 1);
    assert.match(r.stderr, /missing\.patch/);
    assert.equal(r.stdout, "");
  });

  test("--fix-diff with no value is a usage error", () => {
    const c = setup({ "persona-correctness.json": [] });
    const r = merge(c, ["persona-correctness.json", "--fix-diff"]);
    assert.equal(r.code, 2);
    assert.match(r.stderr, /usage: spp findings merge/);
  });
});
