import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

// `claude plugin validate .` does not read workflows/, so this runs workflows/review-panel.js the way the runtime does:
// as an async function body with args, agent, parallel, phase and log in scope, here stubs.
const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "..", "workflows", "review-panel.js"), "utf8").replace(/^export const meta/m, "const meta");

type Call = { prompt: string; opts: { label: string; agentType: string; schema: { required: string[] } } };

async function run(args: unknown, failing: string[] = []) {
  const calls: Call[] = [];
  const logs: string[] = [];
  const agent = async (prompt: string, opts: Call["opts"]) => {
    calls.push({ prompt, opts });
    return failing.includes(opts.label) ? null : { persona: "ignored", findings: [{ file: `${opts.label}.ts`, line: 1, title: "t", severity: "minor", confidence: 90, body: "b" }] };
  };
  const parallel = (thunks: (() => Promise<unknown>)[]) => Promise.all(thunks.map((t) => t().catch(() => null)));
  const body = new Function("args", "agent", "parallel", "phase", "log", `return (async () => {\n${source}\n})()`);
  const result = await body(args, agent, parallel, () => {}, (m: string) => logs.push(m));
  return { result: result as ({ persona: string; findings: { file: string }[] } | null)[], calls, logs };
}

const ARGS = { pr: 258, personas: ["correctness", "testing", "ponytail"] };

describe("happy path", () => {
  test("object args start one spp:reviewer per Persona and return each Persona's findings in the order asked", async () => {
    const { result, calls } = await run(ARGS);
    assert.deepEqual(result.map((r) => r?.persona), ARGS.personas);
    assert.deepEqual(result.map((r) => r?.findings[0].file), ["correctness.ts", "testing.ts", "ponytail.ts"]);
    assert.deepEqual(calls.map((c) => c.opts.agentType), ["spp:reviewer", "spp:reviewer", "spp:reviewer"]);
    assert.ok(calls.every((c) => c.opts.schema.required.includes("findings")));
  });

  test("the prompt names the Persona and points at the panel directory for the pull request", async () => {
    const { calls } = await run(ARGS);
    assert.match(calls[1].prompt, /the testing Persona/);
    assert.match(calls[1].prompt, /spp-panel-258/);
  });

  test("the same args as a JSON string give the same result", async () => {
    const parsed = await run(ARGS);
    const text = await run(JSON.stringify(ARGS));
    assert.deepEqual(text.result, parsed.result);
  });
});

describe("edge cases", () => {
  test("a Persona whose reviewer failed is a null slot, the others still return, and the failure is logged", async () => {
    const { result, logs } = await run(ARGS, ["testing"]);
    assert.equal(result[1], null);
    assert.equal(result[0]?.persona, "correctness");
    assert.equal(result[2]?.persona, "ponytail");
    assert.match(logs.join("\n"), /testing/);
  });
});

describe("error paths", () => {
  const bad: [string, unknown][] = [
    ["no args", undefined],
    ["a pr that is not an integer", { pr: "258", personas: ["correctness"] }],
    ["a pr below 1", { pr: 0, personas: ["correctness"] }],
    ["no Personas", { pr: 258, personas: [] }],
    ["a repeated Persona", { pr: 258, personas: ["testing", "testing"] }],
    ["a Persona name that is not a lowercase word", { pr: 258, personas: ["Correctness"] }],
    ["a JSON string that carries bad args", JSON.stringify({ pr: 258 })],
  ];
  for (const [name, args] of bad)
    test(`${name} is rejected before any reviewer starts`, async () => {
      await assert.rejects(run(args), /args\.(pr|personas) must be/);
    });
});
