import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import type { EpicState, TicketState } from "../src/derive.ts";
import { readTrailer } from "../src/markers.ts";
import { writeVerdict } from "../src/commands/verdict.ts";
import { readVerdict, type Verdict, VERDICT_MARKER } from "../src/verdict.ts";
import { assertCase } from "./harness.ts";

const here = dirname(fileURLToPath(import.meta.url));
const JQ = ".[] | [.id, .body, .user.login, .author_association] | @json";

async function stateOf(n: number): Promise<TicketState> {
  const s = (await assertCase("status", join(here, "fixtures", "verdict", "states"))).json as EpicState;
  const t = s.tickets.find((t) => t.number === n);
  assert.ok(t, `ticket ${n} missing`);
  return t.state;
}

// Runs writeVerdict in this process against the stub gh, with `comments` already on the pull request's thread.
async function write(pr: string, v: Verdict, comments: { id: number; body: string }[] = []) {
  const dir = mkdtempSync(join(tmpdir(), "spp-verdict-"));
  const repo = pr.startsWith("https://") ? "acme/app" : "{owner}/{repo}";
  const stdout = comments.map((c) => JSON.stringify([c.id, c.body, "maint", "OWNER"]) + "\n").join("");
  writeFileSync(join(dir, "gh.json"), JSON.stringify({ [`api repos/${repo}/issues/40/comments --paginate --jq ${JQ}`]: { stdout } }));
  const env = { PATH: process.env.PATH, SPP_CASE: process.env.SPP_CASE, SPP_WRITES: process.env.SPP_WRITES };
  Object.assign(process.env, { PATH: `${join(here, "stubs")}${delimiter}${env.PATH}`, SPP_CASE: dir, SPP_WRITES: join(dir, "writes.jsonl") });
  try {
    await writeVerdict(pr, v);
  } finally {
    for (const [k, val] of Object.entries(env)) val === undefined ? delete process.env[k] : (process.env[k] = val);
  }
  return readFileSync(join(dir, "writes.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l).argv as string[]);
}

const V: Verdict = { ticket: "205", head: "b".repeat(40), spec: "pass", quality: "fail" };
const body = (argv: string[]) => argv.find((a) => a.startsWith("body="))!.slice(5);

describe("happy path", () => {
  test("a verdict comment on the current head with spec pass and quality pass is gate-pass", async () => {
    assert.equal(await stateOf(501), "gate-pass");
  });

  test("writeVerdict creates the spp-verdict comment on the pull request with the verdict in its trailer", async () => {
    const [w, ...more] = await write("40", V);
    assert.equal(more.length, 0);
    assert.deepEqual(w.slice(0, 4), ["api", "-X", "POST", "repos/{owner}/{repo}/issues/40/comments"]);
    const b = body(w);
    assert.equal(b.split("\n")[0], VERDICT_MARKER);
    assert.match(b, /Spec:\*\* pass/);
    assert.match(b, /Quality:\*\* fail/);
    assert.deepEqual({ ...readTrailer(b), by: undefined }, { ...V, by: undefined }); // the maker is checked in markers.test.ts
  });
});

describe("edge cases", () => {
  test("a passing verdict on an older head and none on the new head leaves the ticket pr-open", async () => {
    assert.equal(await stateOf(502), "pr-open");
  });

  test("a verdict comment whose trailer does not decode counts as no verdict", async () => {
    assert.equal(await stateOf(505), "pr-open");
  });

  test("writeVerdict on a pull request URL rewrites the existing verdict comment in place", async () => {
    const old = { id: 77, body: `${VERDICT_MARKER}\nold\n<!-- sdd-data: ${btoa(JSON.stringify({ ...V, spec: "fail" }))} -->\n` };
    const [w] = await write("https://github.com/acme/app/pull/40", V, [{ id: 5, body: "LGTM" }, old]);
    assert.deepEqual(w.slice(0, 4), ["api", "-X", "PATCH", "repos/acme/app/issues/comments/77"]);
    assert.deepEqual({ ...readTrailer(body(w)), by: undefined }, { ...V, by: undefined });
  });
});

describe("error paths", () => {
  test("spec fail on the current head is gate-fail", async () => {
    assert.equal(await stateOf(503), "gate-fail");
  });

  test("quality fail on the current head, recorded by its short sha, is gate-fail", async () => {
    assert.equal(await stateOf(504), "gate-fail");
  });
});

// F17 on #267: the read side of the trailer has one owner, so a renamed field reads as no verdict, never a silent pass.
describe("readVerdict", () => {
  test("a trailer as spp verdict writes it reads back as the same Verdict", () => {
    assert.deepEqual(readVerdict({ ...V }), V);
  });

  test("a trailer with a misspelled or missing field reads as no verdict", () => {
    assert.equal(readVerdict({ ticket: "205", head: V.head, spec: "pass", qualty: "pass" }), null);
    assert.equal(readVerdict({ ticket: "205", spec: "pass", quality: "pass" }), null);
    assert.equal(readVerdict({ ...V, spec: "passed" }), null);
    assert.equal(readVerdict(null), null);
  });
});
