import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { checkFeedback, formatHit, type FeedbackContext } from "../src/feedback.ts";
import { parseRouting } from "../src/routing.ts";
import { assertCase } from "./harness.ts";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => join(here, "fixtures", "feedback", name);

const base: FeedbackContext = { profile: "Anonymous", ownRepo: "acme/app", names: [], titles: [], paths: [] };
const block = (...lines: string[]) => `<!-- sdd-routing -->\n${lines.join("\n")}\n<!-- /sdd-routing -->`;
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
    for (const profile of ["Anonymous", "Full Detail"] as const) assert.deepEqual(hit(TEMPLATE, { profile }), []);
  });

  test("parseRouting reads Self-improvement mode in any case", () => {
    assert.equal(parseRouting(block("- Mode: org", "- Self-improvement mode: Full Detail")).selfImprovement, "Full Detail");
    assert.equal(parseRouting(block("- Mode: org", "- Self-improvement mode: anonymous")).selfImprovement, "Anonymous");
    assert.equal(parseRouting(block("- Mode: org", "- Self-improvement mode: OFF")).selfImprovement, "Off");
  });

  test("parseRouting migrates each Upstream feedback value: off, counts, detailed, attributed, everything", () => {
    const read = (v: string) => parseRouting(block("- Mode: org", `- Upstream feedback: ${v}`)).selfImprovement;
    assert.deepEqual(["off", "counts", "detailed", "attributed", "everything"].map(read), ["Off", "Anonymous", "Anonymous", "Full Detail", "Off"]);
  });

  test("Self-improvement mode wins over an Upstream feedback line in the same block", () => {
    assert.equal(parseRouting(block("- Mode: org", "- Upstream feedback: attributed", "- Self-improvement mode: anonymous")).selfImprovement, "Anonymous");
  });
});

describe("rule 1: URLs", () => {
  test("a body holding https://example.com/x under counts exits 2 and the line names rule 1", async () => {
    await assertCase("feedback", fixture("url-counts"), 2);
  });

  test("an http URL anywhere on a line is a hit", () => {
    assert.deepEqual(hit("a\nsee http://example.com\nb"), ["1@2"]);
  });

  test("under Anonymous even the person's own issue URL blocks", () => {
    assert.ok(hit("https://github.com/acme/app/pull/12", { profile: "Anonymous" }).includes("1@1"));
  });

  test("under attributed, an issue or pull request URL in the own repo passes, with or without an anchor", () => {
    const body = "https://github.com/acme/app/issues/3\nhttps://github.com/acme/app/pull/12#issuecomment-9\nSee https://github.com/Acme/App/pull/4.";
    assert.deepEqual(hit(body, { profile: "Full Detail" }), []);
  });

  test("under attributed, nothing else in the own repo passes: its home page, a blob, a sub-page of a pull request", () => {
    const body = "https://github.com/acme/app\nhttps://github.com/acme/app/blob/main/x\nhttps://github.com/acme/app/pull/12/files\nhttps://github.com/acme/app/pull/12x";
    assert.deepEqual(hit(body, { profile: "Full Detail" }).filter((h) => h.startsWith("1@")), ["1@1", "1@2", "1@3", "1@4"]);
  });

  test("under attributed, a URL in another repo blocks, and a lookalike owner does not pass", () => {
    const body = "https://github.com/other/app/pull/12\nhttps://github.com/acme/app-two/pull/12\nhttps://github.com/xacme/app/pull/12";
    assert.deepEqual(hit(body, { profile: "Full Detail" }).filter((h) => h.startsWith("1@")), ["1@1", "1@2", "1@3"]);
  });
});

describe("rule 1: URLs without an http scheme", () => {
  const leaks = ["www.example.com/internal", "github.com/zz/secret/pull/3", "ftp://files.example/x", "ssh://host.example/repo", "//cdn.example.com/x", "see docs.example.org/a"];

  test("a www host, a domain.tld/path, a scheme-relative URL and any other scheme:// are hits", () => {
    assert.deepEqual(hit(leaks.join("\n")).filter((h) => h.startsWith("1@")), leaks.map((_, i) => `1@${i + 1}`));
  });

  test("under attributed, the own repo's issue and pull request URLs pass without a scheme, anything else does not", () => {
    const pass = "github.com/acme/app/pull/12\nwww.github.com/acme/app/issues/3#issuecomment-9\nSee github.com/Acme/App/pull/4.";
    assert.deepEqual(hit(pass, { profile: "Full Detail" }), []);
    const blocked = "github.com/acme/app\ngithub.com/zz/app/pull/12\nxgithub.com/acme/app/pull/12\ngithub.com/acme/app/pull/12/files";
    assert.deepEqual(hit(blocked, { profile: "Full Detail" }).filter((h) => h.startsWith("1@")), ["1@1", "1@2", "1@3", "1@4"]);
  });

  test("a file name and a tracked path are not URLs", () => {
    assert.deepEqual(hit("see package.json and docs/guide.md"), []);
  });
});

describe("rule 2: names", () => {
  test("under Full Detail, the own owner/repo and bare repo name pass; the bare owner name prints as a warning and exits 0", async () => {
    await assertCase("feedback", fixture("attributed"), 0);
    assert.deepEqual(hit("**Repo:** acme/app\nthe app failed", { profile: "Full Detail" }), []);
    assert.deepEqual(hit("the acme step", { profile: "Full Detail" }), ["2@1"]);
  });

  test("under counts, the own repo name, its owner and its owner/repo string all block", () => {
    assert.deepEqual(hit("acme/app\nthe app failed\nthe Acme team"), ["2@1", "2@2", "2@3"]);
  });

  test("names from the Epic and its Sub-issues block under every profile, attributed included", () => {
    const names = ["acme/api", "acme/app"];
    for (const profile of ["Anonymous", "Full Detail"] as const) assert.deepEqual(hit("calls api here\n", { profile, names }), ["2@1"]);
  });

  test("a name inside a longer word is not a hit", () => {
    assert.deepEqual(hit("an application of the rule", { names: ["acme/app"] }), []);
  });

  test("short names block too, as whole words in any case: hp blocks the hp team but not http", () => {
    for (const profile of ["Anonymous", "Full Detail"] as const) {
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
    const tracked = ["bin/spp"];
    assert.deepEqual(hit("xbin/spp\nmy-bin/spp", { paths: tracked }), []);
  });

  test("the basename of a tracked file with an extension is a hit as a whole word, wherever it sits", () => {
    const tracked = ["src/billing/invoice.ts", "lib/core.py", "spp/src/routing.ts"];
    const leaks = ["edited routing.ts by hand", "invoice.ts failed", "core.py", "xlib/core.py", "(see invoice.ts)."];
    assert.deepEqual(hit(leaks.join("\n"), { paths: tracked }).filter((h) => h.startsWith("3@")), leaks.map((_, i) => `3@${i + 1}`));
  });

  test("a basename matches case-sensitively and whole, and an extensionless basename is an ordinary word", () => {
    const tracked = ["lib/core.py", "bin/spp"];
    assert.deepEqual(hit("Core.py\nscore.py\ncore.pyc\nrun spp today", { paths: tracked }), []);
  });

  test("the last segment of a nested tracked directory is a hit with a trailing or leading slash, not as a plain word", () => {
    const tracked = ["src/billing/invoice.ts"];
    assert.deepEqual(hit("the billing/ module\nthe /billing route\nthe billing module\nbilling-v2/", { paths: tracked }), ["3@1", "3@2"]);
  });

  test("under attributed, own issue and pull request URLs pass rule 3 when tracked directories share their segments", () => {
    const paths = ["app/main.py", "acme/x.py", "issues/a.md", "src/app/__init__.py", "docs/issues/b.md", "pkg/acme/c.py"];
    const body = [
      ...TEMPLATE.split("\n").slice(0, 4),
      "**Repo:** acme/app",
      "**Links:** https://github.com/acme/app/issues/3, https://github.com/acme/app/pull/12",
      "[epic](https://github.com/acme/app/issues/1) <https://github.com/acme/app/pull/4> github.com/acme/app/pull/5 www.github.com/acme/app/issues/6#issuecomment-7",
      ...TEMPLATE.split("\n").slice(4),
    ].join("\n");
    assert.deepEqual(hit(body, { profile: "Full Detail", paths }), []);
  });

  test("under attributed, a tracked path still blocks next to the own repo name, and an own URL still blocks under counts", () => {
    const paths = ["app/models.py"];
    const body = "app/models.py\nacme/app/models.py\nthe app/ folder\nmodels.py";
    assert.deepEqual(hit(body, { profile: "Full Detail", paths }).filter((h) => h.startsWith("3@")), ["3@1", "3@2", "3@3", "3@4"]);
    assert.ok(hit("https://github.com/acme/app/pull/12", { paths }).includes("1@1"));
  });

  test("under attributed, a tracked file named exactly owner/repo blocks with an anchor, a line or a ref after it", () => {
    const paths = ["acme/app"];
    const leaks = ["acme/app#L1", "acme/app:12", "acme/app@main", "acme/app?plain=1"];
    assert.deepEqual(hit(leaks.join("\n"), { profile: "Full Detail", paths }).filter((h) => h.startsWith("3@")), leaks.map((_, i) => `3@${i + 1}`));
    assert.deepEqual(hit("**Repo:** acme/app\nin (acme/app), [acme/app] and acme/app.", { profile: "Full Detail", paths }), []);
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
    assert.deepEqual(checkFeedback("a\n  see https://x.example  ", base), [{ rule: 1, name: "URLs", line: 2, text: "see https://x.example", level: "block" }]);
  });

  test("CRLF line endings count the same lines", () => {
    assert.deepEqual(hit("a\r\nhttps://x.example\r\n"), ["1@2"]);
  });
});

// Every sample is built at runtime so no token-shaped string sits in the repo for secret scanning to flag.
const r = (chars: string, n: number) => chars.repeat(Math.ceil(n / chars.length)).slice(0, n);
const SECRETS: [string, string][] = [
  ["github-pat", "ghp_" + r("a1B", 36)],
  ["github-fine-grained-pat", "github_pat_" + r("a1_", 82)],
  ["github-oauth", "gho_" + r("a1B", 36)],
  ["github-app-token", "ghs_" + r("a1B", 36)],
  ["github-refresh-token", "ghr_" + r("a1B", 36)],
  ["gitlab-pat", "glpat-" + r("a1-", 20)],
  ["aws-access-token", "AKIA" + "IOSFODNN7" + "EXAMPLE"],
  ["gcp-api-key", "AIza" + r("a1-", 35)],
  ["private-key", "-----BEGIN " + "RSA PRIVATE KEY-----"],
  ["slack-bot-token", "xoxb-" + r("1", 12) + "-" + r("2", 12) + "-" + r("aB", 24)],
  ["slack-user-token", "xoxp-" + [r("1", 11), r("2", 11), r("3", 11)].join("-") + "-" + r("aB1", 32)],
  ["anthropic-api-key", "sk-ant-" + "api03-" + r("a1_", 93) + "AA"],
  ["anthropic-admin-api-key", "sk-ant-" + "admin01-" + r("a1_", 93) + "AA"],
  ["openai-api-key", "sk-" + "proj-" + r("a1", 74) + "T3Blbk" + "FJ" + r("b2", 74)],
  ["npm-access-token", "npm_" + r("a1", 36)],
  ["stripe-access-token", "sk_" + "live_" + r("a1", 24)],
  ["jwt", "ey" + r("J1a", 20) + ".ey" + r("J2b", 20) + "." + r("sig", 12)],
];

describe("rule 0: secrets", () => {
  const secretBody = readFileSync(join(fixture("secret-full-detail"), "body.md"), "utf8");

  test("under Full Detail, an AWS key on line 4 blocks with the key redacted, and a name still warns, in line order", async () => {
    await assertCase("feedback", fixture("secret-full-detail"), 2); // expected.txt holds the block line, then the warning
  });

  test("the same body under Anonymous blocks on that line too", () => {
    const line4 = checkFeedback(secretBody, base).find((h) => h.line === 4);
    assert.ok(line4);
    assert.equal(formatHit(line4), "rule 0 Secrets (aws-access-token), line 4: **Observed:** the worker pasted [REDACTED] into the body");
    assert.equal(line4.level, "block");
  });

  test("each of the 17 gitleaks ids blocks a line built to its pattern, under both modes", () => {
    assert.equal(SECRETS.length, 17);
    for (const profile of ["Anonymous", "Full Detail"] as const)
      for (const [id, secret] of SECRETS) {
        const zero = checkFeedback(`the value ${secret} here`, { ...base, profile }).filter((h) => h.rule === 0);
        assert.deepEqual(zero.map((h) => [h.name, h.level]), [[`Secrets (${id})`, "block"]], id);
      }
  });

  test("a private-key header line alone blocks", () => {
    const zero = checkFeedback("a\n-----BEGIN " + "RSA PRIVATE KEY-----\nb", base).filter((h) => h.rule === 0);
    assert.deepEqual(zero.map((h) => [h.name, h.line]), [["Secrets (private-key)", 2]]);
  });

  test("no hit's text contains the secret it matched", () => {
    for (const [id, secret] of SECRETS) {
      const hits = checkFeedback(`x ${secret} https://x.example`, base);
      assert.ok(hits.length > 0 && hits.every((h) => !h.text.includes(secret) && h.text.includes("[REDACTED]")), id);
    }
  });

  test("a secret holding another pattern's match is redacted whole, not only the inner match", () => {
    const aws = "AKIA" + "IOSFODNN7" + "EXAMPLE";
    const jwt = "ey" + r("J1a", 20) + ".ey" + r("J2b", 20) + "-" + aws + "-" + r("c3", 20) + "." + r("sig", 12);
    const hits = checkFeedback(`x ${jwt} y`, base).filter((h) => h.rule === 0);
    assert.deepEqual(hits.map((h) => h.name), ["Secrets (aws-access-token)", "Secrets (jwt)"]);
    assert.equal(hits[0].text, "x [REDACTED] y");
  });

  test("a GitHub token and a URL on one line under Anonymous give a rule 0 and a rule 1 hit, neither holding the token", () => {
    const token = "ghp_" + r("a1B", 36);
    const hits = checkFeedback(`see ${token} at https://x.example`, base);
    assert.deepEqual(hits.map((h) => h.rule), [0, 1]);
    assert.ok(hits.every((h) => !h.text.includes(token)));
  });

  test("near misses get no rule 0 hit: a short ghp_, AKIA in prose, a short npm_, a file name, a short name", () => {
    const lines = ["ghp_" + r("a1B", 35), "the AKIA prefix marks AWS keys", "npm_" + r("a1", 20), "see package.json", "the hp team"];
    assert.deepEqual(checkFeedback(lines.join("\n"), { ...base, ownRepo: "hp/printer" }).filter((h) => h.rule === 0), []);
  });
});

describe("levels", () => {
  const body = "see https://x.example\nedited `spp/src/routing.ts`.";
  const paths = ["spp/src/routing.ts"];

  test("a URL and a tracked path under Full Detail are two warnings", () => {
    assert.deepEqual(checkFeedback(body, { ...base, profile: "Full Detail", paths }).map((h) => [h.rule, h.level]), [[1, "warn"], [3, "warn"]]);
  });

  test("the same body under Anonymous is the same two hits as blocks", () => {
    assert.deepEqual(checkFeedback(body, { ...base, paths }).map((h) => [h.rule, h.level]), [[1, "block"], [3, "block"]]);
  });

  test("formatHit prints a warning as the block line with warning: in front", () => {
    const h = { rule: 2, name: "Names", line: 6, text: "x" };
    assert.equal(formatHit({ ...h, level: "block" }), "rule 2 Names, line 6: x");
    assert.equal(formatHit({ ...h, level: "warn" }), "warning: rule 2 Names, line 6: x");
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

  test("parseRouting reads a missing or unknown mode as Off", () => {
    assert.equal(parseRouting(block("- Mode: org")).selfImprovement, "Off");
    assert.equal(parseRouting(block("- Mode: org", "- Upstream feedback: everything")).selfImprovement, "Off");
    assert.equal(parseRouting(block("- Mode: org", "- Upstream feedback: ")).selfImprovement, "Off");
    assert.equal(parseRouting(block("- Mode: org", "- Self-improvement mode: everything")).selfImprovement, "Off");
    assert.equal(parseRouting(block("- Mode: org", "- Upstream feedback: constructor")).selfImprovement, "Off");
  });

  test("anything but check <body-file> [--title-file <file>] exits 1 with usage", async () => {
    const r = await assertCase("feedback", fixture("usage"), 1);
    assert.match(r.stderr, /usage: spp feedback check/);
  });
});
