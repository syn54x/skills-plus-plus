import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { readTrailer } from "../src/markers.ts";
import { decisionsFile, fingerprint, runsFile, signalsFile, type Run, type Signal } from "../src/signals.ts";
import { runCase } from "./harness.ts";

const FEEDBACK = "syn54x/skills-plus-plus";
const FP = fingerprint("harden", "3", "step-unclear");
const URL = `https://github.com/${FEEDBACK}/issues/900`;
const LIST = `issue list -R ${FEEDBACK} --state open --search ${FP} in:body --json number,url,body`;
const CREATE = `issue create -R ${FEEDBACK} *`;
const COMMENTS = (n: number) => `api repos/${FEEDBACK}/issues/${n}/comments --paginate --jq .[] | [.id, .body, .user.login] | @json`;
const PRIVATE = (repo: string) => `repo view ${repo} --json isPrivate`;
const RAW = (repo: string, file: string) => `api repos/${repo}/contents/${file} -H Accept: application/vnd.github.raw`;
const ROUTING = (mode: string) => `# x\n\n<!-- sdd-routing -->\n- Mode: org\n- Self-improvement mode: ${mode}\n<!-- /sdd-routing -->\n`;
const b64 = (data: unknown) => Buffer.from(JSON.stringify(data)).toString("base64");

type Checkout = { dir: string; state: string; config: string };

// A git checkout whose origin is acme/app, with a Routing block holding `mode`, and state and config directories of its own.
function checkout(mode = "Anonymous", tracked: string[] = []): Checkout {
  const dir = mkdtempSync(join(tmpdir(), "spp-file-"));
  spawnSync("git", ["init", "-q"], { cwd: dir });
  spawnSync("git", ["remote", "add", "origin", "https://github.com/acme/app.git"], { cwd: dir });
  writeFileSync(join(dir, "CLAUDE.md"), ROUTING(mode));
  for (const t of tracked) {
    mkdirSync(join(dir, dirname(t)), { recursive: true });
    writeFileSync(join(dir, t), "x\n");
    spawnSync("git", ["add", t], { cwd: dir });
  }
  return { dir, state: mkdtempSync(join(tmpdir(), "spp-state-")), config: mkdtempSync(join(tmpdir(), "spp-config-")) };
}

const stateEnv = (c: Checkout) => ({ XDG_STATE_HOME: c.state, HOME: c.dir });

function signal(c: Checkout, over: Partial<Signal> = {}): void {
  const s = { at: "2026-01-01T00:00:00.000Z", repo: "acme/app", category: "step-unclear", skill: "harden", step: "3", version: "2.3.0", evidence: "the step was unclear", ...over };
  const line: Signal = { ...s, fingerprint: fingerprint(s.skill, s.step, s.category as Signal["category"]) } as Signal;
  const file = signalsFile(stateEnv(c), "acme/app");
  mkdirSync(dirname(file), { recursive: true });
  appendFileSync(file, JSON.stringify(line) + "\n");
}

function runs(c: Checkout, n: number, over: Partial<Run> = {}): void {
  const file = runsFile(stateEnv(c), "acme/app");
  mkdirSync(dirname(file), { recursive: true });
  for (let i = 0; i < n; i++) appendFileSync(file, JSON.stringify({ at: "2026-01-01T00:00:00.000Z", repo: "acme/app", skill: "harden", step: "3", version: "2.3.0", artifact: "x", ...over }) + "\n");
}

const auto = (c: Checkout) => writeFileSync(join(c.config, "spp", "config.json"), JSON.stringify({ submissionMode: "Auto" }), { flag: "w" });
function setAuto(c: Checkout): void {
  mkdirSync(join(c.config, "spp"), { recursive: true });
  auto(c);
}

// Runs `spp feedback <args>` in the checkout with `gh` answering from `gh`; CI is unset unless `ci` is given.
async function feedback(c: Checkout, args: string[], gh: Record<string, unknown> = {}, ci?: string) {
  writeFileSync(join(c.dir, "args"), args.join("\n") + "\n");
  writeFileSync(join(c.dir, "gh.json"), JSON.stringify(gh));
  process.env.XDG_STATE_HOME = c.state;
  process.env.XDG_CONFIG_HOME = c.config;
  if (ci === undefined) delete process.env.CI;
  else process.env.CI = ci;
  try {
    return await runCase("feedback", c.dir);
  } finally {
    delete process.env.CI;
  }
}

type Write = { cmd: string; argv: string[] };
const writes = (r: { writes: unknown[] }) => r.writes as Write[];
const bodyOf = (w: Write) => w.argv.find((a) => a.startsWith("body="))!.slice(5);
const decisions = (c: Checkout) => {
  const f = decisionsFile(stateEnv(c), "acme/app");
  return existsSync(f) ? readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
};
const lastLine = (s: string) => s.trimEnd().split("\n").at(-1)!;
const PUBLIC = { [PRIVATE("acme/app")]: { stdout: { isPrivate: false } } };
const tallyRow = (body: string) => body.split("\n").filter((l) => /^\| \d/.test(l));

describe("happy path", () => {
  test("Auto, public repo, no open group: creates the issue, posts one tally, prints created", async () => {
    const c = checkout();
    setAuto(c);
    signal(c);
    signal(c, { evidence: "again" });
    runs(c, 5);
    const r = await feedback(c, ["file", FP], { ...PUBLIC, [LIST]: { stdout: [] }, [CREATE]: { stdout: URL + "\n" } });
    assert.equal(r.code, 0, r.stderr);
    assert.equal(lastLine(r.stdout), `filed ${FP} ${URL} created`);
    const [create, post, ...rest] = writes(r);
    assert.deepEqual(rest, []);
    assert.deepEqual(create.argv.slice(0, 8), ["issue", "create", "-R", FEEDBACK, "--title", "harden 3: step-unclear (2/5 runs)", "--label", "skill-feedback"]);
    const body = create.argv[9];
    assert.ok(body.startsWith("<!-- spp-feedback/2 -->\n**Skill:** harden step 3\n**Category:** step-unclear\n"));
    assert.match(body, /\*\*Observed:\*\* 2 Signals of this category were charged to this step over 5 recorded runs\./);
    assert.match(body, /\*\*Eval case:\*\* the fix lands with an eval case that reproduces this defect, red before the fix and green after it\./);
    assert.match(body, /\*\*Filed by:\*\* spp, unattended \(Submission mode Auto\)/);
    assert.deepEqual(readTrailer(body), { fingerprint: FP, skill: "harden", step: "3", category: "step-unclear" });
    assert.deepEqual(post.argv.slice(0, 4), ["api", "-X", "POST", `repos/${FEEDBACK}/issues/900/comments`]);
    const tally = bodyOf(post);
    assert.ok(tally.startsWith("<!-- spp-feedback-tally -->\n"));
    assert.deepEqual(tallyRow(tally), ["| 2.3.0 | 2 | 5 |"]);
    assert.match(tally, /Filed by spp, unattended \(Submission mode Auto\)\./);
    assert.doesNotMatch(tally, /\*\*Repo:\*\*|\*\*Evidence:\*\*/);
    assert.deepEqual(readTrailer(tally), { fingerprint: FP, versions: { "2.3.0": { signals: 2, runs: 5 } }, auto: true });
    assert.deepEqual(decisions(c).map((d) => [d.fingerprint, d.decision, d.issue]), [[FP, "filed", 900]]);
  });

  test("a second run with the first run's decision on disk and the issue OPEN patches the tally: existing", async () => {
    const c = checkout();
    setAuto(c);
    signal(c);
    signal(c);
    runs(c, 5);
    const first = await feedback(c, ["file", FP], { ...PUBLIC, [LIST]: { stdout: [] }, [CREATE]: { stdout: URL + "\n" } });
    assert.equal(first.code, 0, first.stderr);
    const tally = bodyOf(writes(first)[1]);
    const r = await feedback(c, ["file", FP], {
      ...PUBLIC,
      [`issue view 900 -R ${FEEDBACK} --json state`]: { stdout: { state: "OPEN" } },
      "api user --jq .login": { stdout: "me\n" },
      [COMMENTS(900)]: { stdout: JSON.stringify([55, tally, "me"]) + "\n" },
    });
    assert.equal(r.code, 0, r.stderr);
    assert.equal(lastLine(r.stdout), `filed ${FP} ${URL} existing`);
    const [patch, ...rest] = writes(r);
    assert.deepEqual(rest, []);
    assert.deepEqual(patch.argv.slice(0, 4), ["api", "-X", "PATCH", `repos/${FEEDBACK}/issues/comments/55`]);
  });

  test("no local decision: the search's issue whose trailer holds the fingerprint gets my tally, another user's is left alone", async () => {
    const c = checkout();
    setAuto(c);
    signal(c);
    const other = `x\n<!-- sdd-data: ${b64({ fingerprint: "000000000000" })} -->\n`;
    const mine = `x\n<!-- sdd-data: ${b64({ fingerprint: FP })} -->\n`;
    const r = await feedback(c, ["file", FP], {
      ...PUBLIC,
      [LIST]: { stdout: [{ number: 901, url: `https://github.com/${FEEDBACK}/issues/901`, body: other }, { number: 903, url: `https://github.com/${FEEDBACK}/issues/903`, body: mine }, { number: 902, url: `https://github.com/${FEEDBACK}/issues/902`, body: mine }] },
      "api user --jq .login": { stdout: "me\n" },
      [COMMENTS(902)]: { stdout: [JSON.stringify([70, "<!-- spp-feedback-tally -->\ntheirs", "other"]), JSON.stringify([71, "<!-- spp-feedback-tally -->\nmine", "me"])].join("\n") + "\n" },
    });
    assert.equal(r.code, 0, r.stderr);
    assert.equal(lastLine(r.stdout), `filed ${FP} https://github.com/${FEEDBACK}/issues/902 existing`);
    assert.deepEqual(writes(r).map((w) => w.argv.slice(0, 4)), [["api", "-X", "PATCH", `repos/${FEEDBACK}/issues/comments/71`]]);
  });

  test("Review (no config file): prints the preview and exits 3 with no writes; --confirm <hash> files it", async () => {
    const c = checkout();
    signal(c);
    runs(c, 2);
    const gh = { [LIST]: { stdout: [] }, [CREATE]: { stdout: URL + "\n" } };
    const r = await feedback(c, ["file", FP], gh);
    assert.equal(r.code, 3, r.stderr);
    assert.deepEqual(writes(r), []);
    assert.ok(r.stdout.startsWith("title: harden 3: step-unclear (1/2 runs)\n<!-- spp-feedback/2 -->\n"));
    assert.doesNotMatch(r.stdout, /Filed by/);
    assert.match(r.stdout, /\n\n<!-- spp-feedback-tally -->\n/);
    const confirm = /^confirm: ([0-9a-f]{12})$/.exec(lastLine(r.stdout));
    assert.ok(confirm, r.stdout);
    const ok = await feedback(c, ["file", FP, "--confirm", confirm[1]], gh);
    assert.equal(ok.code, 0, ok.stderr);
    assert.equal(lastLine(ok.stdout), `filed ${FP} ${URL} created`);
    assert.doesNotMatch(writes(ok)[0].argv[9], /Filed by/);
    assert.doesNotMatch(bodyOf(writes(ok)[1]), /Filed by/);
    const wrong = await feedback(c, ["file", FP, "--confirm", "000000000000"], { [`issue view 900 -R ${FEEDBACK} --json state`]: { stdout: { state: "OPEN" } } });
    assert.equal(wrong.code, 3, wrong.stderr);
    assert.ok(wrong.stdout.startsWith(`issue: ${URL}\n\n<!-- spp-feedback-tally -->\n`));
    assert.deepEqual(writes(wrong), []);
  });

  test("Signals at 2.3.0 and 2.4.0 with runs at 2.4.0 and 2.10.0 give three rows in numeric order, zeros where missing", async () => {
    const c = checkout();
    setAuto(c);
    signal(c);
    signal(c, { version: "2.4.0" });
    runs(c, 1, { version: "2.4.0" });
    runs(c, 1, { version: "2.10.0" });
    const r = await feedback(c, ["file", FP], { ...PUBLIC, [LIST]: { stdout: [] }, [CREATE]: { stdout: URL + "\n" } });
    assert.equal(r.code, 0, r.stderr);
    assert.deepEqual(tallyRow(bodyOf(writes(r)[1])), ["| 2.3.0 | 1 | 0 |", "| 2.4.0 | 1 | 1 |", "| 2.10.0 | 0 | 1 |"]);
  });

  test("spp feedback submission auto writes Auto and keeps another key; with no value it reads it back", async () => {
    const c = checkout();
    mkdirSync(join(c.config, "spp"), { recursive: true });
    writeFileSync(join(c.config, "spp", "config.json"), JSON.stringify({ other: 1 }));
    const r = await feedback(c, ["submission", "auto"]);
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stdout, "Submission mode: Auto\n");
    assert.deepEqual(JSON.parse(readFileSync(join(c.config, "spp", "config.json"), "utf8")), { other: 1, submissionMode: "Auto" });
    const read = await feedback(c, ["submission"]);
    assert.equal(read.stdout, "Submission mode: Auto\n");
  });

  test("spp feedback submission review writes Review into $XDG_CONFIG_HOME/spp/config.json, creating it", async () => {
    const c = checkout();
    const r = await feedback(c, ["submission", "review"]);
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stdout, "Submission mode: Review\n");
    assert.deepEqual(JSON.parse(readFileSync(join(c.config, "spp", "config.json"), "utf8")), { submissionMode: "Review" });
  });
});

describe("edge cases", () => {
  test("Auto with isPrivate true falls back to the Review preview, with the fall-back line on stderr", async () => {
    const c = checkout();
    setAuto(c);
    signal(c);
    const r = await feedback(c, ["file", FP], { [PRIVATE("acme/app")]: { stdout: { isPrivate: true } }, [LIST]: { stdout: [] } });
    assert.equal(r.code, 3, r.stderr);
    assert.match(r.stderr, /spp feedback file: Submission mode Auto falls back to Review: acme\/app is private/);
    assert.match(lastLine(r.stdout), /^confirm: /);
    assert.doesNotMatch(r.stdout, /Filed by/);
    assert.deepEqual(writes(r), []);
  });

  const plan = (repos: string[]) => ({
    stdout: JSON.stringify([1, `<!-- sdd-plan -->\n## Plan\n<!-- sdd-data: ${b64({ repos })} -->\n`, "lead", "MEMBER"]) + "\n",
  });
  const EPIC = "api repos/{owner}/{repo}/issues/7/comments --paginate --jq .[] | [.id, .body, .user.login, .author_association] | @json";

  test("--epic whose acme/api says Anonymous while the checkout says Full Detail: the tally has no Repo or Evidence lines", async () => {
    const c = checkout("Full Detail");
    setAuto(c);
    signal(c);
    const r = await feedback(c, ["file", FP, "--epic", "7"], {
      [EPIC]: plan(["acme/app", "acme/api"]),
      [RAW("acme/app", "CLAUDE.md")]: { stdout: ROUTING("Full Detail") },
      [RAW("acme/api", "CLAUDE.md")]: { stdout: ROUTING("Anonymous") },
      ...PUBLIC,
      [PRIVATE("acme/api")]: { stdout: { isPrivate: false } },
      [LIST]: { stdout: [] },
      [CREATE]: { stdout: URL + "\n" },
    });
    assert.equal(r.code, 0, r.stderr);
    assert.doesNotMatch(bodyOf(writes(r)[1]), /\*\*Repo:\*\*|\*\*Evidence:\*\*/);
  });

  test("the same --epic under Full Detail everywhere puts the Repo and Evidence lines in the tally", async () => {
    const c = checkout("Full Detail");
    setAuto(c);
    signal(c, { evidence: "the step named no file" });
    const r = await feedback(c, ["file", FP, "--epic", "7"], {
      [EPIC]: plan(["acme/app", "acme/api"]),
      [RAW("acme/app", "CLAUDE.md")]: { stdout: ROUTING("Full Detail") },
      [RAW("acme/api", "CLAUDE.md")]: { code: 1, stderr: "Not Found" },
      [RAW("acme/api", "AGENTS.md")]: { stdout: ROUTING("Full Detail") },
      ...PUBLIC,
      [PRIVATE("acme/api")]: { stdout: { isPrivate: false } },
      [LIST]: { stdout: [] },
      [CREATE]: { stdout: URL + "\n" },
    });
    assert.equal(r.code, 0, r.stderr);
    const tally = bodyOf(writes(r)[1]);
    assert.match(tally, /\*\*Repo:\*\* acme\/app/);
    assert.match(tally, /\*\*Evidence:\*\*\n\n- the step named no file/);
  });

  test("--epic with acme/api private under Auto runs as Review", async () => {
    const c = checkout("Full Detail");
    setAuto(c);
    signal(c);
    const r = await feedback(c, ["file", FP, "--epic", "7"], {
      [EPIC]: plan(["acme/app", "acme/api"]),
      [RAW("acme/app", "CLAUDE.md")]: { stdout: ROUTING("Full Detail") },
      [RAW("acme/api", "CLAUDE.md")]: { stdout: ROUTING("Full Detail") },
      ...PUBLIC,
      [PRIVATE("acme/api")]: { stdout: { isPrivate: true } },
      [LIST]: { stdout: [] },
    });
    assert.equal(r.code, 3, r.stderr);
    assert.match(r.stderr, /falls back to Review: acme\/api is private/);
    assert.deepEqual(writes(r), []);
  });

  test("--epic repo whose contents calls fail for both files is Off: exit 1", async () => {
    const c = checkout();
    signal(c);
    const r = await feedback(c, ["file", FP, "--epic", "7"], {
      [EPIC]: plan(["acme/api"]),
      [RAW("acme/api", "CLAUDE.md")]: { code: 1, stderr: "Not Found" },
      [RAW("acme/api", "AGENTS.md")]: { code: 1, stderr: "Not Found" },
    });
    assert.equal(r.code, 1);
    assert.match(r.stderr, /Self-improvement mode is Off \(or unset\): nothing may be filed/);
    assert.deepEqual(writes(r), []);
  });

  test("Review with --confirm of a stale hash (a Signal added after the preview) shows the new preview, exit 3, no writes", async () => {
    const c = checkout();
    signal(c);
    const gh = { [LIST]: { stdout: [] }, [CREATE]: { stdout: URL + "\n" } };
    const first = await feedback(c, ["file", FP], gh);
    const hash = lastLine(first.stdout).slice("confirm: ".length);
    signal(c);
    const r = await feedback(c, ["file", FP, "--confirm", hash], gh);
    assert.equal(r.code, 3, r.stderr);
    assert.notEqual(lastLine(r.stdout), lastLine(first.stdout));
    assert.match(r.stdout, /\(2 Signals\)/);
    assert.deepEqual(writes(r), []);
  });

  test("step \"\" leaves the step out of the title and the Skill line", async () => {
    const c = checkout();
    signal(c, { skill: "triage", step: "", category: "other" });
    const fp = fingerprint("triage", "", "other");
    const r = await feedback(c, ["file", fp], { [`issue list -R ${FEEDBACK} --state open --search ${fp} in:body --json number,url,body`]: { stdout: [] } });
    assert.equal(r.code, 3, r.stderr);
    assert.ok(r.stdout.startsWith("title: triage: other (1 Signals)\n"));
    assert.match(r.stdout, /^\*\*Skill:\*\* triage$/m);
  });

  test("spp feedback skip <fp> prints skipped and pending omits it, even after a newer Signal", async () => {
    const c = checkout();
    signal(c);
    const r = await feedback(c, ["skip", FP]);
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stdout, `skipped ${FP}\n`);
    assert.deepEqual(writes(r), []);
    assert.deepEqual((await feedback(c, ["pending", "--json"])).json, []);
    signal(c, { at: "2999-01-01T00:00:00.000Z" });
    assert.deepEqual((await feedback(c, ["pending", "--json"])).json, []);
  });

  test("pending omits a filed fingerprint until a Signal with a later at is recorded", async () => {
    const c = checkout();
    setAuto(c);
    signal(c);
    assert.equal((await feedback(c, ["file", FP], { ...PUBLIC, [LIST]: { stdout: [] }, [CREATE]: { stdout: URL + "\n" } })).code, 0);
    assert.equal((await feedback(c, ["pending"])).stdout, "");
    signal(c, { at: "2999-01-01T00:00:00.000Z" });
    assert.equal((await feedback(c, ["pending"])).stdout, `${FP} 2 harden 3 step-unclear\n`);
  });
});

describe("error paths", () => {
  test("Anonymous with a URL in --note exits 2 with the rule 1 line, no writes and no decision line", async () => {
    const c = checkout();
    setAuto(c);
    signal(c);
    const r = await feedback(c, ["file", FP, "--note", "see https://example.com"], { ...PUBLIC, [LIST]: { stdout: [] }, [CREATE]: { stdout: URL + "\n" } });
    assert.equal(r.code, 2, r.stderr);
    assert.match(r.stdout, /^rule 1 URLs, line \d+: \*\*Note:\*\* see https:\/\/example\.com$/m);
    assert.deepEqual(writes(r), []);
    assert.deepEqual(decisions(c), []);
  });

  test("Full Detail with evidence naming a tracked path prints a warning and files: exit 0", async () => {
    const c = checkout("Full Detail", ["src/billing/invoice.ts"]);
    setAuto(c);
    signal(c, { evidence: "edited src/billing/invoice.ts by hand" });
    const r = await feedback(c, ["file", FP], { ...PUBLIC, [LIST]: { stdout: [] }, [CREATE]: { stdout: URL + "\n" } });
    assert.equal(r.code, 0, r.stderr);
    assert.match(r.stdout, /^warning: rule 3 Paths, line \d+: - edited src\/billing\/invoice\.ts by hand$/m);
    assert.equal(lastLine(r.stdout), `filed ${FP} ${URL} created`);
  });

  test("CI=true exits 1 with not filed: CI and no gh call; Routing Off exits 1 with the Off message", async () => {
    const c = checkout();
    setAuto(c);
    signal(c);
    const ci = await feedback(c, ["file", FP], {}, "true");
    assert.equal(ci.code, 1);
    assert.equal(ci.stderr, "spp feedback file: not filed: CI\n");
    assert.deepEqual(writes(ci), []);
    const off = checkout("Off");
    signal(off);
    const r = await feedback(off, ["file", FP]);
    assert.equal(r.code, 1);
    assert.equal(r.stderr, "spp feedback file: Self-improvement mode is Off (or unset): nothing may be filed\n");
    assert.deepEqual(writes(r), []);
  });

  test("an unknown fingerprint for file or skip exits 1 with no Signals with fingerprint", async () => {
    const c = checkout();
    for (const sub of ["file", "skip"]) {
      const r = await feedback(c, [sub, "deadbeef0000"]);
      assert.equal(r.code, 1, sub);
      assert.match(r.stderr, /no Signals with fingerprint deadbeef0000/);
    }
    assert.deepEqual(decisions(c), []);
  });

  test("a failing gh issue create exits 1 with its message and no decision line", async () => {
    const c = checkout();
    setAuto(c);
    signal(c);
    const r = await feedback(c, ["file", FP], { ...PUBLIC, [LIST]: { stdout: [] }, [CREATE]: { code: 1, stderr: "HTTP 403: boom" } });
    assert.equal(r.code, 1);
    assert.match(r.stderr, /HTTP 403: boom/);
    assert.deepEqual(decisions(c), []);
  });

  test("submission maybe, file with no fingerprint and --change rewrite it each exit 1 with the usage on stderr", async () => {
    const c = checkout();
    signal(c);
    for (const args of [["submission", "maybe"], ["file"], ["file", FP, "--change", "rewrite it"]]) {
      const r = await feedback(c, args);
      assert.equal(r.code, 1, args.join(" "));
      assert.match(r.stderr, /usage: spp feedback/, args.join(" "));
      assert.deepEqual(writes(r), []);
    }
  });
});
