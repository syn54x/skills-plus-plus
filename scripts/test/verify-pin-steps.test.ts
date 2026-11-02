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

  test("diagnosing-bugs confirms the pin before it runs an issue's Verify block as its loop", () => {
    const para = /^\*\*A Verify block comes first\.\*\*.*$/m.exec(skill("diagnosing-bugs"))?.[0] ?? "";
    const lint = para.indexOf("`spp lint ticket <N>`");
    assert.ok(lint >= 0, "no pin check");
    assert.ok(lint < para.indexOf("Run it"), "the block runs before the pin check");
  });

  test("build runs a merged issue's Verify through spp verify, never by hand", () => {
    const merged = /^- `0`: merged\..*$/m.exec(readFileSync(join(root, "skills", "build", "EPIC.md"), "utf8"))?.[0] ?? "";
    assert.match(merged, /`spp verify <N>`/);
    assert.doesNotMatch(merged, /run the merged issue's Verify block/);
  });
});
