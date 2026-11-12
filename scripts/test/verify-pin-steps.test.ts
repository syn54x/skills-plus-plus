// ADR 0009: a Verify block is pinned only from the file the agent wrote to the issue, never from the issue as fetched.
// These pin the harden and triaging steps that call `spp lint ticket`, since a step that pins the fetched body would
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
  test("every --pin harden and triaging run passes the body file the agent wrote", () => {
    for (const name of ["harden", "triaging"]) {
      const pins = lintCalls(skill(name)).filter((c) => c.includes("--pin"));
      assert.ok(pins.length > 0, `${name} never pins`);
      // `--by "<skill> <step>"` only names the pin's maker; the pinned block still comes from <file>.
      for (const c of pins) assert.match(c, /^`spp lint ticket <N> --pin <file>( --by "[a-z][a-z-]*( [^"`]+)?")?`$/, `${name}: ${c}`);
    }
  });

  test("triaging does not re-pin an untouched body: its step 3 lint runs without --pin", () => {
    const step3 = /^3\. (.*)$/m.exec(skill("triaging").split("### `ready-for-agent`")[1])?.[1] ?? "";
    assert.deepEqual(lintCalls(step3), ["`spp lint ticket <N>`"]);
  });

  test("triaging pins only in step 2, where it rewrote the body from its own file", () => {
    const steps = skill("triaging").split("### `ready-for-agent`")[1];
    const step2 = /^2\. (.*)$/m.exec(steps)?.[1] ?? "";
    // The re-pin is recorded as triaging's, so a Signal against the block is charged to triaging, not harden (#341, #409).
    assert.match(step2, /--body-file <file>`.*`spp lint ticket <N> --pin <file> --by "triaging re-pin"`/);
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

  test("building runs a merged issue's Verify through spp verify, never by hand", () => {
    const merged = /^- `0`: merged\..*$/m.exec(readFileSync(join(root, "skills", "building", "EPIC.md"), "utf8"))?.[0] ?? "";
    assert.match(merged, /`spp verify <N>`/);
    assert.doesNotMatch(merged, /run the merged issue's Verify block/);
  });

  // Review of #275: since F46, a hardened issue whose pin is missing or changed reads raw; the slice gate must still
  // refuse it as step 3.1 does, never review it as an unlinked pull request.
  test("review's sort table stops a raw issue with a pin rule with the step 3.1 refusal, before the quality-only row", () => {
    const text = skill("review");
    const table = text.split("## 3. Run the evidence")[0];
    assert.match(table, /`spp kind N --json`/);
    const pinRow = /^\| `#N` \| `raw` with a `rule` \|.*$/m.exec(table)?.[0] ?? "";
    assert.match(pinRow, /`pin-present` or `pin-match`/);
    assert.match(pinRow, /post no verdict/);
    assert.match(pinRow, /harden again/);
    const quality = /^\|.*\| `raw`, no `rule` \| Quality only\..*$/m.exec(table)?.[0] ?? "";
    assert.ok(quality, "the quality-only row is not limited to a raw issue with no rule");
    assert.ok(table.indexOf(pinRow) < table.indexOf(quality), "the pin row must come before the quality-only row");
  });

  test("review-panel stops on a linked raw issue with a pin rule, as on a refused Verify", () => {
    const step = /^The pull request body's `Closes #N` names its issue\..*$/m.exec(skill("review-panel"))?.[0] ?? "";
    assert.match(step, /`spp kind N --json`/);
    assert.match(step, /`raw` with a `rule`.*harden again.*stop/);
  });

  test("review-panel runs each closed Sub-issue's Verify through spp verify and stops on a refusal", () => {
    const item = /^- \*\*Verify\.\*\*.*$/m.exec(skill("review-panel"))?.[0] ?? "";
    assert.match(item, /`spp verify <N>` for each closed Sub-issue/);
    assert.match(item, /never the block's commands by hand/);
    assert.match(item, /refus.*\bstop\b/);
  });
});
