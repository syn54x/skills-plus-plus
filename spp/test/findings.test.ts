import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { mergeFindings, panelVerdict, parsePersonaFindings, type Readings } from "../src/findings.ts";
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
