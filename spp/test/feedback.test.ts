import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { checkFeedback, type FeedbackContext } from "../src/feedback.ts";
import { parseRouting } from "../src/routing.ts";
import { assertCase } from "./harness.ts";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => join(here, "fixtures", "feedback", name);

const base: FeedbackContext = { profile: "counts", ownRepo: "acme/app", names: [], titles: [], paths: [] };
const hit = (body: string, over: Partial<FeedbackContext> = {}) =>
  checkFeedback(body, { ...base, ...over }).map((h) => `${h.rule}@${h.line}`);

const TEMPLATE = [
  "<!-- spp-feedback/1 -->",
  "**Skill:** harden step 3",
  "**Category:** verify-unrunnable",
  "**Observed:** 2 of 7 Sub-issues needed their Verify block rewritten; it caused 1 fix round.",
  "**Retro counts:** Sub-issues 7 · fix rounds 3 · by cause: told 4, not told 1, untagged 0 · hand-backs 1 · panel 2 rounds, 5 findings · ponytail did not run",
  "**Harness:** claude-code 2.1.0 · gh 2.94.0",
  "**Proposed change:** add a check",
  "**Eval case:** the fix lands with an eval case that reproduces this defect, red before the fix and green after it.",
].join("\n");

describe("happy path", () => {
  test("a counts body with only the template fields exits 0 with no output", async () => {
    const r = await assertCase("feedback", fixture("clean-counts")); // expected.txt is empty
    assert.equal(r.stdout, "");
  });

  test("the template body has no hit under any profile", () => {
    for (const profile of ["counts", "detailed", "attributed"] as const) assert.deepEqual(hit(TEMPLATE, { profile }), []);
  });

  test("parseRouting on a block with Upstream feedback: detailed reads detailed", () => {
    const block = (...lines: string[]) => `<!-- sdd-routing -->\n${lines.join("\n")}\n<!-- /sdd-routing -->`;
    assert.equal(parseRouting(block("- Mode: org", "- Upstream feedback: detailed")).upstreamFeedback, "detailed");
    assert.equal(parseRouting(block("- Mode: org", "- Upstream feedback: attributed")).upstreamFeedback, "attributed");
    assert.equal(parseRouting(block("- Mode: org", "- Upstream feedback: counts")).upstreamFeedback, "counts");
  });
});

describe("rule 1: URLs", () => {
  test("a body holding https://example.com/x under counts exits 2 and the line names rule 1", async () => {
    await assertCase("feedback", fixture("url-counts"), 2);
  });

  test("an http URL anywhere on a line is a hit", () => {
    assert.deepEqual(hit("a\nsee http://example.com\nb"), ["1@2"]);
  });

  test("under counts and detailed even the person's own issue URL blocks", () => {
    const body = "https://github.com/acme/app/pull/12";
    for (const profile of ["counts", "detailed"] as const) assert.ok(hit(body, { profile }).includes("1@1"));
  });

  test("under attributed, an issue or pull request URL in the own repo passes, with or without an anchor", () => {
    const body = "https://github.com/acme/app/issues/3\nhttps://github.com/acme/app/pull/12#issuecomment-9\nSee https://github.com/Acme/App/pull/4.";
    assert.deepEqual(hit(body, { profile: "attributed" }), []);
  });

  test("under attributed, nothing else in the own repo passes: its home page, a blob, a sub-page of a pull request", () => {
    const body = "https://github.com/acme/app\nhttps://github.com/acme/app/blob/main/x\nhttps://github.com/acme/app/pull/12/files\nhttps://github.com/acme/app/pull/12x";
    assert.deepEqual(hit(body, { profile: "attributed" }).filter((h) => h.startsWith("1@")), ["1@1", "1@2", "1@3", "1@4"]);
  });

  test("under attributed, a URL in another repo blocks, and a lookalike owner does not pass", () => {
    const body = "https://github.com/other/app/pull/12\nhttps://github.com/acme/app-two/pull/12\nhttps://github.com/xacme/app/pull/12";
    assert.deepEqual(hit(body, { profile: "attributed" }).filter((h) => h.startsWith("1@")), ["1@1", "1@2", "1@3"]);
  });
});

describe("rule 2: names", () => {
  test("under attributed, the own owner/repo and bare repo name pass; the bare owner name blocks on its own line", async () => {
    await assertCase("feedback", fixture("attributed"), 2);
    assert.deepEqual(hit("**Repo:** acme/app\nthe app failed", { profile: "attributed" }), []);
    assert.deepEqual(hit("the acme step", { profile: "attributed" }), ["2@1"]);
  });

  test("under counts, the own repo name, its owner and its owner/repo string all block", () => {
    assert.deepEqual(hit("acme/app\nthe app failed\nthe Acme team"), ["2@1", "2@2", "2@3"]);
  });

  test("names from the Epic and its Sub-issues block under every profile, attributed included", () => {
    const names = ["acme/api", "acme/app"];
    for (const profile of ["counts", "detailed", "attributed"] as const) assert.deepEqual(hit("calls api here\n", { profile, names }), ["2@1"]);
  });

  test("a name inside a longer word is not a hit, and a name under 3 characters is skipped", () => {
    assert.deepEqual(hit("an application of the rule", { names: ["acme/app"] }), []);
    assert.deepEqual(hit("ab and cd", { names: ["ab/cd"] }), []);
  });

  test("matching ignores case", () => {
    assert.deepEqual(hit("ACME wrote it"), ["2@1"]);
  });
});

describe("rule 3: paths", () => {
  const paths = ["spp/src/routing.ts", "README.md", "skills/close-epic/FEEDBACK.md"];

  test("a body naming a path git ls-files lists is a rule 3 hit", async () => {
    await assertCase("feedback", fixture("tracked-path"), 2);
    assert.deepEqual(hit("edited `spp/src/routing.ts`.", { paths }), ["3@1"]);
  });

  test("a root file, a path with a line number and a quoted path all match", () => {
    assert.deepEqual(hit("see README.md\nat (spp/src/routing.ts:12:3)\n\"skills/close-epic/FEEDBACK.md\"", { paths }).filter((h) => h.startsWith("3@")), ["3@1", "3@2", "3@3"]);
  });

  test("a directory containing tracked files counts when written with a slash", () => {
    assert.deepEqual(hit("under spp/src and skills/", { paths }), ["3@1"]);
  });

  test("a plain word that names a directory, and an untracked path, pass", () => {
    assert.deepEqual(hit("the skills are fine\nsee docs/other.md", { paths }), []);
  });
});

describe("rule 4: code", () => {
  test("a fenced block blocks on its fence lines", () => {
    assert.deepEqual(hit("a\n```ts\nx\n```\nb"), ["4@2", "4@4"]);
    assert.deepEqual(hit("~~~\nx\n~~~"), ["4@1", "4@3"]);
  });

  test("a line ending in ; or {, or holding =>, or starting with import, def or func reads as code", () => {
    const lines = ["run();", "if (x) {", "const f = () => 1", "import fs", "  def run", "func main"];
    assert.deepEqual(hit(lines.join("\n")).filter((h) => h.startsWith("4@")), lines.map((_, i) => `4@${i + 1}`));
  });

  test("prose with a mid-line semicolon, or the word import mid-line, is not code", () => {
    assert.deepEqual(hit("it failed; the worker fixed it\nwe did not import it"), []);
  });
});

describe("rule 5: titles", () => {
  const titles = ["Add the outbound check to close-epic", "Short title here"];

  test("four words copied from a title is a hit, ignoring case and punctuation", () => {
    assert.deepEqual(hit("The Outbound check, to run", { titles }), ["5@1"]);
  });

  test("three words from a title, and any words of a title under four words, pass", () => {
    assert.deepEqual(hit("the outbound check ran\nshort title here", { titles }), []);
  });

  test("the four words must be in order on one line", () => {
    assert.deepEqual(hit("check outbound the to add", { titles }), []);
  });
});

describe("rule 6: error text", () => {
  test("a line with Traceback, Error or exit code is a hit", () => {
    assert.deepEqual(hit("Traceback (most recent call last)\nTypeError: x\nit gave exit code 2"), ["6@1", "6@2", "6@3"]);
  });

  test("a stack frame line and a commit message line are hits", () => {
    assert.deepEqual(hit("    at run (file.js:10:5)\nfix(parser): handle the thing"), ["6@1", "6@2"]);
  });

  test("a sentence about errors in lower case is not a hit", () => {
    assert.deepEqual(hit("the step gave no errors"), []);
  });
});

describe("edge cases", () => {
  test("a body with three hits prints three lines and exits 2", async () => {
    const r = await assertCase("feedback", fixture("three-hits"), 2);
    assert.equal(r.stdout.trim().split("\n").length, 3);
  });

  test("one rule reports a line once, and hits come in line order", () => {
    assert.deepEqual(hit("https://a.example https://b.example\nok\nTraceback"), ["1@1", "6@3"]);
  });

  test("a hit carries the rule name and the trimmed line", () => {
    assert.deepEqual(checkFeedback("a\n  see https://x.example  ", base), [{ rule: 1, name: "URLs", line: 2, text: "see https://x.example" }]);
  });

  test("CRLF line endings count the same lines", () => {
    assert.deepEqual(hit("a\r\nhttps://x.example\r\n"), ["1@2"]);
  });
});

describe("error paths", () => {
  test("profile off exits 1 with a line saying nothing may be filed", async () => {
    const r = await assertCase("feedback", fixture("off"), 1);
    assert.match(r.stderr, /nothing may be filed/);
    assert.equal(r.stdout, "");
  });

  test("a missing Upstream feedback line reads as off", async () => {
    const r = await assertCase("feedback", fixture("missing"), 1);
    assert.match(r.stderr, /nothing may be filed/);
  });

  test("an unknown profile reads as off", async () => {
    const r = await assertCase("feedback", fixture("unknown"), 1);
    assert.match(r.stderr, /nothing may be filed/);
  });

  test("parseRouting reads a missing or unknown Upstream feedback as off", () => {
    const block = (...lines: string[]) => `<!-- sdd-routing -->\n${lines.join("\n")}\n<!-- /sdd-routing -->`;
    assert.equal(parseRouting(block("- Mode: org")).upstreamFeedback, "off");
    assert.equal(parseRouting(block("- Mode: org", "- Upstream feedback: everything")).upstreamFeedback, "off");
    assert.equal(parseRouting(block("- Mode: org", "- Upstream feedback: ")).upstreamFeedback, "off");
  });

  test("anything but check <body-file> [--title-file <file>] exits 1 with usage", async () => {
    const r = await assertCase("feedback", fixture("usage"), 1);
    assert.match(r.stderr, /usage: spp feedback check/);
  });
});
