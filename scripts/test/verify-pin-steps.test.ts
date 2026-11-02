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
