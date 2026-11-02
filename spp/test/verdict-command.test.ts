import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { readTrailer } from "../src/markers.ts";
import { assertCase } from "./harness.ts";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => join(here, "fixtures", "verdict-command", name);
const body = (w: unknown) => (w as { argv: string[] }).argv.find((a) => a.startsWith("body="))!.slice(5);

describe("happy path", () => {
  test("spp verdict on the pull request's current head writes its spp-verdict comment", async () => {
    const r = await assertCase("verdict", fixture("current-head")); // expected-writes.jsonl
    assert.deepEqual(readTrailer(body(r.writes[0])), { ticket: "219", head: "ccccccc", spec: "pass", quality: "fail" });
  });
});

describe("error paths", () => {
  test("a head the pull request has moved past exits 3 and writes nothing", async () => {
    const r = await assertCase("verdict", fixture("head-moved"), 3);
    assert.match(r.stderr, /head moved/);
  });

  test("a verdict other than pass or fail is a usage error that writes nothing", async () => {
    await assertCase("verdict", fixture("bad-spec"), 2);
  });

  test("a missing --head is a usage error that writes nothing", async () => {
    await assertCase("verdict", fixture("no-head"), 2);
  });
});
