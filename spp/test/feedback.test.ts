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
  "**Observed:** 2 of 7 Sub-issues needed their Verify block rewritten, which caused 1 fix round.",
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

describe("rule 1: URLs without an http scheme", () => {
  const leaks = ["www.example.com/internal", "github.com/zz/secret/pull/3", "ftp://files.example/x", "ssh://host.example/repo", "//cdn.example.com/x", "see docs.example.org/a"];

  test("a www host, a domain.tld/path, a scheme-relative URL and any other scheme:// are hits", () => {
    assert.deepEqual(hit(leaks.join("\n")).filter((h) => h.startsWith("1@")), leaks.map((_, i) => `1@${i + 1}`));
  });

  test("under attributed, the own repo's issue and pull request URLs pass without a scheme, anything else does not", () => {
    const pass = "github.com/acme/app/pull/12\nwww.github.com/acme/app/issues/3#issuecomment-9\nSee github.com/Acme/App/pull/4.";
    assert.deepEqual(hit(pass, { profile: "attributed" }), []);
    const blocked = "github.com/acme/app\ngithub.com/zz/app/pull/12\nxgithub.com/acme/app/pull/12\ngithub.com/acme/app/pull/12/files";
    assert.deepEqual(hit(blocked, { profile: "attributed" }).filter((h) => h.startsWith("1@")), ["1@1", "1@2", "1@3", "1@4"]);
  });

  test("a file name and a tracked path are not URLs", () => {
    assert.deepEqual(hit("see package.json and docs/guide.md"), []);
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

  test("a name inside a longer word is not a hit", () => {
    assert.deepEqual(hit("an application of the rule", { names: ["acme/app"] }), []);
  });

  test("short names block too, as whole words in any case: hp blocks the hp team but not http", () => {
    for (const profile of ["counts", "detailed", "attributed"] as const) {
      assert.deepEqual(hit("the hp team", { profile, ownRepo: "hp/printer" }), ["2@1"]);
      assert.deepEqual(hit("the HP team\nab and cd", { profile, ownRepo: "hp/printer", names: ["ab/cd"] }), ["2@1", "2@2"]);
    }
    assert.deepEqual(hit("we use http", { ownRepo: "hp/printer" }), []);
  });

  test("a name glued to another word by a dash still blocks", () => {
    assert.deepEqual(hit("the acme-corp team"), ["2@1"]);
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

  test("a tracked path inside a longer token is a hit: anchors, refs, key=value, diff prefixes, absolute and Windows paths", () => {
    const tracked = ["src/billing/invoice.ts", "lib/core.py"];
    const leaks = [
      "src/billing/invoice.ts#L10",
      "/home/taylor/work/repo/src/billing/invoice.ts",
      "--- a/src/billing/invoice.ts",
      "+++ b/lib/core.py",
      "src/billing/invoice.ts@main",
      "file=lib/core.py",
      "file:lib/core.py",
      "C:\\work\\repo\\src\\billing\\invoice.ts",
      "https://x.example/blob/main/lib/core.py?plain=1",
    ];
    assert.deepEqual(hit(leaks.join("\n"), { paths: tracked }).filter((h) => h.startsWith("3@")), leaks.map((_, i) => `3@${i + 1}`));
  });

  test("a different path that merely shares a tail with a tracked one passes", () => {
    const tracked = ["lib/core.py"];
    assert.deepEqual(hit("xlib/core.py\nmy-lib/core.py", { paths: tracked }), []);
  });

  test("any home path is a hit even when nothing under it is tracked", () => {
    const lines = ["/home/taylor/x", "/Users/taylor/Library", "~/notes", "C:\\Users\\taylor\\Desktop", "cd /Users/zz"];
    assert.deepEqual(hit(lines.join("\n")).filter((h) => h.startsWith("3@")), lines.map((_, i) => `3@${i + 1}`));
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

  test("a semicolon anywhere on a line reads as code, and so does shell or SQL with one", () => {
    const lines = ["it failed; the worker fixed it", "cd build; make install", "for (i = 0; i < n; i++)", "DROP TABLE users; --"];
    assert.deepEqual(hit(lines.join("\n")).filter((h) => h.startsWith("4@")), lines.map((_, i) => `4@${i + 1}`));
  });

  test("the word import mid-line is not code", () => {
    assert.deepEqual(hit("we did not import it"), []);
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

  test("error, fatal: and exit code match in any case", () => {
    const lines = ["error: pathspec did not match", "ERROR something", "fatal: not a git repository", "Exit Code 3", "the step gave no errors"];
    assert.deepEqual(hit(lines.join("\n")), lines.map((_, i) => `6@${i + 1}`));
  });

  test("a Python, Go, Rust, Java or generic frame is a hit with no header line", () => {
    const lines = [
      '  File "/srv/app/lib/core.py", line 3, in <module>',
      "\t/srv/app/main.go:12 +0x1d",
      "goroutine 1 [running]:",
      "thread 'main' panicked at src/main.rs:2:5",
      "at com.x.Bar.run(Bar.java:10)",
      "see main.rs:2:5",
      "see util.c:77",
    ];
    assert.deepEqual(hit(lines.join("\n")).filter((h) => h.startsWith("6@")), lines.map((_, i) => `6@${i + 1}`));
  });
});

describe("edge cases", () => {
  test("a body with three hits prints three lines and exits 2", async () => {
    const r = await assertCase("feedback", fixture("three-hits"), 2);
    assert.equal(r.stdout.trim().split("\n").length, 3);
  });

  test("an owner/repo line in the title file turns a body that names that repo into a rule 2 hit", async () => {
    await assertCase("feedback", fixture("title-file-names"), 2);
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
