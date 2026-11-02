import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
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
