import { test } from "node:test";
import assert from "node:assert";
import { report } from "../src/report.ts";

test("prints one line per entry", () => {
  const out = report([
    { date: "2026-01-01", text: "a" },
    { date: "2026-02-01", text: "b" },
  ]);
  assert.equal(out, "2026-01-01 a\n2026-02-01 b");
});
