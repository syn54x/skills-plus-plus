import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { assertCase } from "./harness.ts";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => join(here, "fixtures", "kind", name);

describe("happy path", () => {
  test("spp kind 197 on an issue with Sub-issues is an epic", async () => {
    await assertCase("kind", fixture("epic")); // expected.json
  });

  test("spp kind 12 on a hardened issue with size:S and no parent is a one-off", async () => {
    await assertCase("kind", fixture("one-off"));
  });

  test("spp kind 12 on a hardened issue with a parent Epic is a sub-issue", async () => {
    await assertCase("kind", fixture("sub-issue"));
  });
});

describe("edge cases", () => {
  test("spp kind 13 on an issue with no Verify section is raw with reason missing Verify", async () => {
    await assertCase("kind", fixture("raw-no-verify"));
  });

  test("a hardened body with no size label is raw", async () => {
    await assertCase("kind", fixture("raw-no-size"));
  });

  test("an issue URL is read through gh by that URL", async () => {
    await assertCase("kind", fixture("url"));
  });

  // F44 (Round 3) on #267.
  test("an issue with a parent Epic that fails the lint is raw, not sub-issue", async () => {
    await assertCase("kind", fixture("raw-sub-issue"));
  });

  // F46 (Round 3) on #267: the lint `spp kind` stands for checks the pin too, so /build sends these to /triage.
  // Review of #275: --json names the failing pin rule, so /review can stop with its refusal instead of quality only.
  test("a hardened One-off whose Verify block carries no pin is raw, with rule pin-present and its detail", async () => {
    await assertCase("kind", fixture("raw-unpinned"));
  });

  test("a hardened One-off whose Verify block changed since its pin is raw, with rule pin-match and its detail", async () => {
    await assertCase("kind", fixture("raw-pin-changed"));
  });

  test("a raw issue that fails the lint itself carries no rule", async () => {
    const r = await assertCase("kind", fixture("raw-no-size"));
    assert.equal(Object.hasOwn(r.json as object, "rule"), false);
  });
});

describe("integration", () => {
  test("the text view prints kind and reason on one line", async () => {
    await assertCase("kind", fixture("one-off-text")); // expected.txt
  });

  test("a non-issue argument exits 2 with usage", async () => {
    const r = await assertCase("kind", fixture("bad-ref"), 2);
    assert.match(r.stderr, /usage: spp kind/);
  });
});
