import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { readTrailer } from "../src/markers.ts";
import { parseTicket } from "../src/ticket.ts";
import { assertCase, runCase } from "./harness.ts";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => join(here, "fixtures", "lint", name);

describe("happy path", () => {
  test("spp lint ticket 12 on a hardened body exits 0 with ok true", async () => {
    await assertCase("lint", fixture("hardened")); // expected.json
  });

  test("the text view of a passing body prints ok", async () => {
    await assertCase("lint", fixture("hardened-text")); // expected.txt
  });
});

describe("error paths", () => {
  test("TBD in Interfaces exits 1 with no-placeholder naming the section", async () => {
    await assertCase("lint", fixture("placeholder"), 1);
  });

  test("a scenario line without an arrow exits 1 with scenario-shape", async () => {
    await assertCase("lint", fixture("scenario-shape"), 1);
  });

  test("two size labels exit 1 with one-size", async () => {
    await assertCase("lint", fixture("two-sizes"), 1);
  });

  test("no size label exits 1 with one-size", async () => {
    await assertCase("lint", fixture("no-size"), 1);
  });

  test("a Files owned line starting with Edit exits 1 with files-owned-shape", async () => {
    await assertCase("lint", fixture("files-edit"), 1);
  });

  test("a Verify section with no fenced block exits 1 with verify-fenced", async () => {
    await assertCase("lint", fixture("unfenced-verify"), 1);
  });

  test("a missing section exits 1 with section-present naming it", async () => {
    await assertCase("lint", fixture("missing-section"), 1);
  });

  test("every placeholder form is reported, one failure each", async () => {
    await assertCase("lint", fixture("placeholders-all"), 1);
  });

  test("the text view prints one rule: detail line per failure", async () => {
    await assertCase("lint", fixture("placeholder-text"), 1);
  });
});

describe("edge cases", () => {
  test("Test scenarios reading Test expectation: none, because docs only pass the scenario rule", async () => {
    await assertCase("lint", fixture("no-tests"));
  });

  test("a placeholder word inside a code span is not a placeholder", async () => {
    await assertCase("lint", fixture("hardened")); // hardened.md quotes `TBD` in What to build
  });

  test("an issue URL is read through gh by that URL", async () => {
    await assertCase("lint", fixture("url"));
  });

  test("anything but lint ticket <issue> exits 2 with usage", async () => {
    const r = await assertCase("lint", fixture("bad-usage"), 2);
    assert.match(r.stderr, /usage: spp lint ticket/);
  });
});

// ADR 0009: hardening pins the approved Verify block, so spp verify can refuse a block edited since.
describe("--pin", () => {
  const COMMENTS = "api repos/{owner}/{repo}/issues/12/comments --paginate --jq .[] | [.id, .body, .user.login, .author_association] | @json";
  type Write = { argv: string[] };
  const body = (w: Write) => w.argv.find((a) => a.startsWith("body="))!.slice(5);

  // The lint fixture `name`, run as `spp lint ticket 12 --pin`, with `comments` as the issue's comments.
  function pinCase(name: string, comments = ""): string {
    const dir = mkdtempSync(join(tmpdir(), "spp-lint-pin-"));
    writeFileSync(join(dir, "args"), "ticket\n12\n--pin\n");
    const gh = JSON.parse(readFileSync(join(fixture(name), "gh.json"), "utf8"));
    writeFileSync(join(dir, "gh.json"), JSON.stringify({ ...gh, [COMMENTS]: { stdout: comments } }));
    return dir;
  }

  test("a passing ticket pins the sha256 of its Verify block in a new progress comment's trailer", async () => {
    const r = await runCase("lint", pinCase("hardened"));
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stdout, "ok\n");
    const writes = r.writes as Write[];
    assert.equal(writes.length, 1);
    assert.deepEqual(writes[0].argv.slice(0, 4), ["api", "-X", "POST", "repos/{owner}/{repo}/issues/12/comments"]);
    const pin = createHash("sha256").update("npm ci\nnode --test test/greet.test.ts").digest("hex");
    assert.deepEqual(readTrailer(body(writes[0])), { verifyPin: pin });
    assert.match(body(writes[0]), /^<!-- sdd-progress -->\n\*\*Verify pin:\*\* `[0-9a-f]{12}`\n/);
  });

  test("an existing progress comment keeps its fields and gains the pin", async () => {
    const old = { status: "handed-back", worker: "w", branch: "", pr: null, verify: { state: "not-run", sha: "" }, route: "needs-info", reason: "r", notes: "" };
    const row = JSON.stringify([5, `<!-- sdd-progress -->\n<!-- sdd-data: ${Buffer.from(JSON.stringify(old)).toString("base64")} -->`, "maint", "OWNER"]) + "\n";
    const r = await runCase("lint", pinCase("hardened", row));
    assert.equal(r.code, 0, r.stderr);
    const writes = r.writes as Write[];
    assert.deepEqual(writes[0].argv.slice(0, 4), ["api", "-X", "PATCH", "repos/{owner}/{repo}/issues/comments/5"]);
    assert.deepEqual(Object.keys(readTrailer(body(writes[0]))!), [...Object.keys(old), "verifyPin"]);
  });

  test("a failing ticket pins nothing", async () => {
    const r = await runCase("lint", pinCase("placeholder"));
    assert.equal(r.code, 1);
    assert.deepEqual(r.writes, []);
  });
});

describe("parseTicket", () => {
  const t = parseTicket(readFileSync(fixture("hardened.md"), "utf8"));

  test("splits level-2 sections and trims them", () => {
    assert.deepEqual(Object.keys(t.sections), ["Parent", "What to build", "Acceptance criteria", "Files owned", "Interfaces", "Test scenarios", "Verify", "Blocked by"]);
    assert.equal(t.sections.Parent, "#10");
  });

  test("reads Files owned as kind and paths", () => {
    assert.deepEqual(t.filesOwned, [
      { kind: "Create", paths: ["src/greet.ts", "src/greet2.ts"] },
      { kind: "Modify", paths: ["bin/spp"] },
      { kind: "Test", paths: ["test/greet.test.ts"] },
    ]);
  });

  test("reads Consumes and Produces lines", () => {
    assert.deepEqual(t.consumes, ["`runGh` from #200."]);
    assert.deepEqual(t.produces, ["`greet(name: string): string`, used by #13."]);
  });

  test("joins a continuation line onto its scenario", () => {
    assert.equal(t.scenarios.length, 4);
    assert.equal(t.scenarios[1], "Edge case: an empty name → prints `hello, world`.");
  });

  test("returns the Verify fence's content", () => {
    assert.equal(t.verify, "npm ci\nnode --test test/greet.test.ts");
  });

  test("a ## line inside a fenced block does not start a section", () => {
    const body = "## Verify\n\n```bash\n## not a heading\nnpm ci\n```\n\n## Next\n\nx";
    const p = parseTicket(body);
    assert.deepEqual(Object.keys(p.sections), ["Verify", "Next"]);
    assert.equal(p.verify, "## not a heading\nnpm ci");
  });

  test("a body with no Verify section has a null verify and no sections invented", () => {
    const p = parseTicket("## What to build\n\nx");
    assert.equal(p.verify, null);
    assert.deepEqual(p.filesOwned, []);
    assert.deepEqual(p.scenarios, []);
  });
});
