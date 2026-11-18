import assert from "node:assert";
import { test } from "node:test";
import { addEntry } from "../src/store.ts";

test("adding two entries gives ids 1 and 2", () => {
  assert.strictEqual(addEntry("first"), 1);
  assert.strictEqual(addEntry("second"), 2);
});
