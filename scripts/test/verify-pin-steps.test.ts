// ADR 0009: a Verify block is pinned only from the file the agent wrote to the issue, never from the issue as fetched.
// These pin the harden and triage steps that call `spp lint ticket`, since a step that pins the fetched body would
// approve whatever anyone edited into it after the agent's write.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const skill = (name: string) => readFileSync(join(root, "skills", name, "SKILL.md"), "utf8");
const lintCalls = (text: string) => [...text.matchAll(/`spp lint ticket <N>[^`]*`/g)].map((m) => m[0]);

describe("Verify pin steps", () => {
  test("every --pin harden and triage run passes the body file the agent wrote", () => {
    for (const name of ["harden", "triage"]) {
      const pins = lintCalls(skill(name)).filter((c) => c.includes("--pin"));
      assert.ok(pins.length > 0, `${name} never pins`);
      for (const c of pins) assert.equal(c, "`spp lint ticket <N> --pin <file>`", `${name}: ${c}`);
    }
  });

  test("triage does not re-pin an untouched body: its step 3 lint runs without --pin", () => {
    const step3 = /^3\. (.*)$/m.exec(skill("triage").split("### `ready-for-agent`")[1])?.[1] ?? "";
    assert.deepEqual(lintCalls(step3), ["`spp lint ticket <N>`"]);
  });

  test("triage pins only in step 2, where it rewrote the body from its own file", () => {
    const steps = skill("triage").split("### `ready-for-agent`")[1];
    const step2 = /^2\. (.*)$/m.exec(steps)?.[1] ?? "";
    assert.match(step2, /--body-file <file>`.*`spp lint ticket <N> --pin <file>`/);
  });
});

// Panel F24 on #267: a block edited after the pin must be refused before anyone runs it by hand, not only when
// spp verify finally reads it. These pin every step that runs an issue's Verify block outside spp verify.
describe("the pin is checked before any hand run of a Verify block", () => {
  test("implement-issue runs the ready-gate lint at readiness, before it routes a bug or runs a prose block", () => {
    const text = skill("implement-issue");
    const readiness = text.split("## 1. Readiness")[1].split("## 2. Claim")[0];
    assert.deepEqual(lintCalls(readiness), ["`spp lint ticket <N>`"]);
    assert.match(readiness, /`spp lint ticket <N>`[^\n]*\bstop\b/);
    assert.ok(text.indexOf("## 1. Readiness") < text.indexOf('"diagnosing-bugs"'));
    assert.ok(text.indexOf("## 1. Readiness") < text.indexOf("**Prose issues.**"));
  });

  // Panel F40 (Round 3) on #267: the pin check and the hand run read the issue once, through `spp verify <N> --print`,
  // so a block that flips between two fetches can never pass the check as one text and run as another.
  test("implement-issue's prose red run runs only what spp verify --print printed", () => {
    const prose = /^\*\*Prose issues\.\*\*.*$/m.exec(skill("implement-issue"))?.[0] ?? "";
    assert.match(prose, /`spp verify <N> --print`/);
    assert.match(prose, /only the commands it printed/);
    assert.match(prose, /never a copy of the block you fetched/);
  });

  test("diagnosing-bugs takes an issue's Verify block as its loop only from spp verify --print", () => {
    const text = skill("diagnosing-bugs");
    const para = /^\*\*A Verify block comes first\.\*\*.*$/m.exec(text)?.[0] ?? "";
    const print = para.indexOf("`spp verify <N> --print`");
    assert.ok(print >= 0, "no pin check");
    assert.ok(print < para.indexOf("Run "), "the block runs before the pin check");
    assert.match(para, /only the commands it printed/);
    assert.match(para, /never a copy of the block you fetched/);
    const lockIn = text.split("## 4. Lock it in")[1].split("## 5.")[0];
    assert.match(lockIn, /For an issue with a Verify block, the loop is the commands `spp verify <N> --print` prints/);
  });

  test("build runs a merged issue's Verify through spp verify, never by hand", () => {
    const merged = /^- `0`: merged\..*$/m.exec(readFileSync(join(root, "skills", "build", "EPIC.md"), "utf8"))?.[0] ?? "";
    assert.match(merged, /`spp verify <N>`/);
    assert.doesNotMatch(merged, /run the merged issue's Verify block/);
  });

  test("review-panel runs each closed Sub-issue's Verify through spp verify and stops on a refusal", () => {
    const item = /^- \*\*Verify\.\*\*.*$/m.exec(skill("review-panel"))?.[0] ?? "";
    assert.match(item, /`spp verify <N>` for each closed Sub-issue/);
    assert.match(item, /never the block's commands by hand/);
    assert.match(item, /refus.*\bstop\b/);
  });
});
