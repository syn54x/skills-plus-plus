import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { repoKey } from "../src/feedback-file.ts";
import { readTrailer } from "../src/markers.ts";
import { encodeTrailer } from "../src/snapshot.ts";
import { decisionsFile, fingerprint, pluginVersion, runsFile, signalsFile, type Run, type Signal } from "../src/signals.ts";
import { tallySecret } from "../src/submission.ts";
import { runCase } from "./harness.ts";

const FEEDBACK = "syn54x/skills-plus-plus";
const FP = fingerprint("harden", "3", "step-unclear");
const URL = `https://github.com/${FEEDBACK}/issues/900`;
const SEARCH = (fp: string) => `api --paginate -X GET search/issues -f q=${fp} in:body repo:${FEEDBACK} is:issue is:open --jq .items[] | [.number, .html_url, .body, .user.login, .author_association] | @json`;
const LIST = SEARCH(FP);
const VIEW = (n: number) => `api repos/${FEEDBACK}/issues/${n} --jq [.state, .user.login, .author_association] | @json`;
// The decision's issue, open and opened by the gh user.
const open = () => ({ stdout: JSON.stringify(["open", "me", "NONE"]) + "\n" });
// Search hits as the jq prints them: one [number, url, body, login, association] line each.
const hits = (...issues: [number, string, string, string][]) => ({ stdout: issues.map(([n, body, login, assoc]) => JSON.stringify([n, `https://github.com/${FEEDBACK}/issues/${n}`, body, login, assoc]) + "\n").join("") });
const ME = { "api user --jq .login": { stdout: "me\n" } };
const CREATE = `issue create -R ${FEEDBACK} *`;
const COMMENTS = (n: number) => `api repos/${FEEDBACK}/issues/${n}/comments --paginate --jq .[] | [.id, .body, .user.login] | @json`;
const PRIVATE = (repo: string) => `repo view ${repo} --json isPrivate`;
const RAW = (repo: string, file: string) => `api repos/${repo}/contents/${file} -H Accept: application/vnd.github.raw`;
const ROUTING = (mode: string) => `# x\n\n<!-- sdd-routing -->\n- Mode: org\n- Self-improvement mode: ${mode}\n<!-- /sdd-routing -->\n`;
const b64 = (data: unknown) => Buffer.from(JSON.stringify(data)).toString("base64");

type Checkout = { dir: string; state: string; config: string };

// A git checkout whose origin is acme/app, with a Routing block holding `mode`, and state and config directories of its own.
function checkout(mode = "Anonymous", tracked: string[] = [], origin = "acme/app"): Checkout {
  const dir = mkdtempSync(join(tmpdir(), "spp-file-"));
  spawnSync("git", ["init", "-q"], { cwd: dir });
  spawnSync("git", ["remote", "add", "origin", `https://github.com/${origin}.git`], { cwd: dir });
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

function setAuto(c: Checkout, repo = "acme/app"): void {
  configure(c, { submissionMode: { [repo]: "Auto" } });
}

const SECRET = "5ec7e75ec7e75ec7e75ec7e75ec7e75ec7e75ec7e75ec7e75ec7e75ec7e75ec7";
// Gives the person a known tally secret, so a test can build the tally key a run will match.
const seedSecret = (c: Checkout) => configure(c, { tallySecret: SECRET });

// Merges `over` into the person's config file, creating it.
function configure(c: Checkout, over: Record<string, unknown>): void {
  const file = join(c.config, "spp", "config.json");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify({ ...(existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {}), ...over }));
}

// Runs `spp feedback <args>` in the checkout with `gh` answering from `gh`, in an Attended session unless `attended` is
// false; CI is unset unless `ci` is given.
async function feedback(c: Checkout, args: string[], gh: Record<string, unknown> = {}, ci?: string, attended = true) {
  writeFileSync(join(c.dir, "args"), args.join("\n") + "\n");
  writeFileSync(join(c.dir, "gh.json"), JSON.stringify(gh));
  process.env.XDG_STATE_HOME = c.state;
  process.env.XDG_CONFIG_HOME = c.config;
  if (attended) process.env.CLAUDE_CODE_SESSION_ATTENDED = "1";
  else delete process.env.CLAUDE_CODE_SESSION_ATTENDED;
  if (ci === undefined) delete process.env.CI;
  else process.env.CI = ci;
  try {
    return await runCase("feedback", c.dir);
  } finally {
    delete process.env.CI;
    delete process.env.CLAUDE_CODE_SESSION_ATTENDED;
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
// A tally comment body as filing from `repo` writes it: only its marker and trailer matter to the match.
const tallyFor = (repo: string) => `<!-- spp-feedback-tally -->\n${encodeTrailer({ fingerprint: FP, repoKey: repoKey(repo, SECRET) })}\n`;

describe("happy path", () => {
  test("Auto, public repo, no open group: creates the issue, posts one tally, prints created", async () => {
    const c = checkout();
    setAuto(c);
    signal(c);
    signal(c, { evidence: "again" });
    runs(c, 5);
    const r = await feedback(c, ["file", FP], { ...PUBLIC, [LIST]: { stdout: "" }, [CREATE]: { stdout: URL + "\n" } });
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
    assert.deepEqual(readTrailer(tally), { fingerprint: FP, versions: { "2.3.0": { signals: 2, runs: 5 } }, auto: true, repoKey: repoKey("acme/app", JSON.parse(readFileSync(join(c.config, "spp", "config.json"), "utf8")).tallySecret), by: { skill: "feedback", version: pluginVersion() } });
    assert.doesNotMatch(tally, /acme/);
    assert.deepEqual(decisions(c).map((d) => [d.fingerprint, d.decision, d.issue]), [[FP, "created", 900], [FP, "filed", 900]]);
  });

  test("a second run with the first run's decision on disk and the issue OPEN patches the tally: existing", async () => {
    const c = checkout();
    setAuto(c);
    signal(c);
    signal(c);
    runs(c, 5);
    const first = await feedback(c, ["file", FP], { ...PUBLIC, [LIST]: { stdout: "" }, [CREATE]: { stdout: URL + "\n" } });
    assert.equal(first.code, 0, first.stderr);
    const tally = bodyOf(writes(first)[1]);
    const r = await feedback(c, ["file", FP], {
      ...PUBLIC,
      [VIEW(900)]: open(),
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
    seedSecret(c);
    signal(c);
    const other = `x\n<!-- sdd-data: ${b64({ fingerprint: "000000000000" })} -->\n`;
    const mine = `x\n<!-- sdd-data: ${b64({ fingerprint: FP })} -->\n`;
    const r = await feedback(c, ["file", FP], {
      ...PUBLIC,
      [LIST]: hits([901, other, "me", "NONE"], [903, mine, "me", "NONE"], [902, mine, "lead", "MEMBER"]),
      "api user --jq .login": { stdout: "me\n" },
      [COMMENTS(902)]: { stdout: [JSON.stringify([70, tallyFor("acme/app"), "other"]), JSON.stringify([71, tallyFor("acme/app"), "me"])].join("\n") + "\n" },
    });
    assert.equal(r.code, 0, r.stderr);
    assert.equal(lastLine(r.stdout), `filed ${FP} https://github.com/${FEEDBACK}/issues/902 existing`);
    assert.deepEqual(writes(r).map((w) => w.argv.slice(0, 4)), [["api", "-X", "PATCH", `repos/${FEEDBACK}/issues/comments/71`]]);
  });

  test("Review (no config file): prints the preview and exits 3 with no writes; --confirm <hash> files it", async () => {
    const c = checkout();
    signal(c);
    runs(c, 2);
    const gh = { [LIST]: { stdout: "" }, [CREATE]: { stdout: URL + "\n" } };
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
    const wrong = await feedback(c, ["file", FP, "--confirm", "000000000000"], { ...ME, [VIEW(900)]: open() });
    assert.equal(wrong.code, 3, wrong.stderr);
    assert.ok(wrong.stdout.startsWith(`issue: ${URL} (by me)\n\n<!-- spp-feedback-tally -->\n`));
    assert.deepEqual(writes(wrong), []);
  });

  test("Signals at 2.3.0 and 2.4.0 with runs at 2.4.0 and 2.10.0 give three rows in numeric order, zeros where missing", async () => {
    const c = checkout();
    setAuto(c);
    signal(c);
    signal(c, { version: "2.4.0" });
    runs(c, 1, { version: "2.4.0" });
    runs(c, 1, { version: "2.10.0" });
    const r = await feedback(c, ["file", FP], { ...PUBLIC, [LIST]: { stdout: "" }, [CREATE]: { stdout: URL + "\n" } });
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
    assert.deepEqual(JSON.parse(readFileSync(join(c.config, "spp", "config.json"), "utf8")), { other: 1, submissionMode: { "acme/app": "Auto" } });
    const read = await feedback(c, ["submission"]);
    assert.equal(read.stdout, "Submission mode: Auto\n");
  });

  test("spp feedback submission review writes Review into $XDG_CONFIG_HOME/spp/config.json, creating it", async () => {
    const c = checkout();
    const r = await feedback(c, ["submission", "review"]);
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stdout, "Submission mode: Review\n");
    assert.deepEqual(JSON.parse(readFileSync(join(c.config, "spp", "config.json"), "utf8")), { submissionMode: { "acme/app": "Review" } });
  });

  const cfg = (c: Checkout) => join(c.config, "spp", "config.json");
  // Two checkouts of different repos for the same person share one config directory.
  const sameConfig = (a: Checkout, b: Checkout) => ((b.config = a.config), b);

  test("the mode is kept per repo: Auto in acme/site and Review in acme/internal stay apart", async () => {
    const site = checkout("Anonymous", [], "acme/site");
    const internal = sameConfig(site, checkout("Anonymous", [], "acme/internal"));
    const w = await feedback(site, ["submission", "Auto"]);
    assert.equal(w.code, 0, w.stderr);
    assert.equal(w.stdout, "Submission mode: Auto\n");
    assert.deepEqual(JSON.parse(readFileSync(cfg(site), "utf8")), { submissionMode: { "acme/site": "Auto" } });
    assert.equal((await feedback(internal, ["submission", "review"])).stdout, "Submission mode: Review\n");
    assert.deepEqual(JSON.parse(readFileSync(cfg(site), "utf8")), { submissionMode: { "acme/site": "Auto", "acme/internal": "Review" } });
    assert.equal((await feedback(site, ["submission"])).stdout, "Submission mode: Auto\n");
  });

  test("a repo with no entry reads Review", async () => {
    const c = checkout("Anonymous", [], "acme/new");
    setAuto(c, "acme/site");
    assert.equal((await feedback(c, ["submission"])).stdout, "Submission mode: Review\n");
  });

  test("a string submissionMode reads as Review and the next write replaces it, keeping other keys", async () => {
    const c = checkout();
    mkdirSync(join(c.config, "spp"), { recursive: true });
    writeFileSync(cfg(c), JSON.stringify({ other: 1, submissionMode: "Auto" }));
    assert.equal((await feedback(c, ["submission"])).stdout, "Submission mode: Review\n");
    await feedback(c, ["submission", "auto"]);
    assert.deepEqual(JSON.parse(readFileSync(cfg(c), "utf8")), { other: 1, submissionMode: { "acme/app": "Auto" } });
  });

  test("spp feedback file previews when only another repo is Auto", async () => {
    const c = checkout();
    setAuto(c, "acme/site");
    signal(c);
    const r = await feedback(c, ["file", FP], { ...PUBLIC, [LIST]: { stdout: "" } });
    assert.equal(r.code, 3, r.stderr);
    assert.deepEqual(writes(r), []);
  });

  test("a checkout with no GitHub origin exits 1 with the origin message", async () => {
    const c = checkout();
    spawnSync("git", ["remote", "remove", "origin"], { cwd: c.dir });
    const r = await feedback(c, ["submission"]);
    assert.equal(r.code, 1);
    assert.match(r.stderr, /^spp feedback submission: cannot tell this checkout's GitHub repository/);
  });
});

describe("edge cases", () => {
  test("Auto with isPrivate true falls back to the Review preview, with the fall-back line on stderr", async () => {
    const c = checkout();
    setAuto(c);
    signal(c);
    const r = await feedback(c, ["file", FP], { [PRIVATE("acme/app")]: { stdout: { isPrivate: true } }, [LIST]: { stdout: "" } });
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
      [LIST]: { stdout: "" },
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
      [LIST]: { stdout: "" },
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
      [LIST]: { stdout: "" },
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
    const gh = { [LIST]: { stdout: "" }, [CREATE]: { stdout: URL + "\n" } };
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
    const r = await feedback(c, ["file", fp], { [SEARCH(fp)]: { stdout: "" } });
    assert.equal(r.code, 3, r.stderr);
    assert.ok(r.stdout.startsWith("title: triage: other (1 Signals)\n"));
    assert.match(r.stdout, /^\*\*Skill:\*\* triage$/m);
  });

  test("the last decision names an issue whose gh issue view fails: spp falls through to the search, creates, exits 0", async () => {
    const c = checkout();
    setAuto(c);
    signal(c);
    const file = decisionsFile(stateEnv(c), "acme/app");
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify({ at: "2026-01-01T00:00:00.000Z", fingerprint: FP, decision: "filed", issue: 800 }) + "\n");
    const r = await feedback(c, ["file", FP], {
      ...PUBLIC,
      [VIEW(800)]: { code: 1, stderr: "GraphQL: Could not resolve to an issue" },
      [LIST]: { stdout: "" },
      [CREATE]: { stdout: URL + "\n" },
    });
    assert.equal(r.code, 0, r.stderr);
    assert.equal(lastLine(r.stdout), `filed ${FP} ${URL} created`);
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
    assert.equal((await feedback(c, ["file", FP], { ...PUBLIC, [LIST]: { stdout: "" }, [CREATE]: { stdout: URL + "\n" } })).code, 0);
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
    const r = await feedback(c, ["file", FP, "--note", "see https://example.com"], { ...PUBLIC, [LIST]: { stdout: "" }, [CREATE]: { stdout: URL + "\n" } });
    assert.equal(r.code, 2, r.stderr);
    assert.match(r.stdout, /^rule 1 URLs, line \d+: \*\*Note:\*\* see https:\/\/example\.com$/m);
    assert.deepEqual(writes(r), []);
    assert.deepEqual(decisions(c), []);
  });

  test("Full Detail with evidence naming a tracked path prints a warning and files: exit 0", async () => {
    const c = checkout("Full Detail", ["src/billing/invoice.ts"]);
    setAuto(c);
    signal(c, { evidence: "edited src/billing/invoice.ts by hand" });
    const r = await feedback(c, ["file", FP], { ...PUBLIC, [LIST]: { stdout: "" }, [CREATE]: { stdout: URL + "\n" } });
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
    const r = await feedback(c, ["file", FP], { ...PUBLIC, [LIST]: { stdout: "" }, [CREATE]: { code: 1, stderr: "HTTP 403: boom" } });
    assert.equal(r.code, 1);
    assert.match(r.stderr, /HTTP 403: boom/);
    assert.deepEqual(decisions(c), []);
  });

  test("gh issue create succeeds and the tally POST fails: exit 1 with one created line; a rerun posts on that issue", async () => {
    const c = checkout();
    setAuto(c);
    signal(c);
    const POST = `api -X POST repos/${FEEDBACK}/issues/900/comments *`;
    const r = await feedback(c, ["file", FP], { ...PUBLIC, [LIST]: { stdout: "" }, [CREATE]: { stdout: URL + "\n" }, [POST]: { code: 1, stderr: "HTTP 403: secondary rate limit" } });
    assert.equal(r.code, 1);
    assert.match(r.stderr, /secondary rate limit/);
    assert.deepEqual(decisions(c).map((d) => [d.decision, d.issue]), [["created", 900]]);
    assert.equal((await feedback(c, ["pending"])).stdout, `${FP} 1 harden 3 step-unclear\n`);
    const again = await feedback(c, ["file", FP], {
      ...PUBLIC,
      [VIEW(900)]: open(),
      "api user --jq .login": { stdout: "me\n" },
      [COMMENTS(900)]: { stdout: "" },
    });
    assert.equal(again.code, 0, again.stderr);
    assert.deepEqual(writes(again).map((w) => w.argv.slice(0, 4)), [["api", "-X", "POST", `repos/${FEEDBACK}/issues/900/comments`]]);
    assert.deepEqual(decisions(c).map((d) => [d.decision, d.issue]), [["created", 900], ["filed", 900]]);
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

describe("review round 1 guards", () => {
  test("F1: an untrusted author's issue naming the fingerprint is passed over, and spp creates the real one", async () => {
    const c = checkout();
    setAuto(c);
    signal(c);
    const forged = `**Fingerprint:** ${FP}\n${encodeTrailer({ fingerprint: FP })}\n`;
    const r = await feedback(c, ["file", FP], { ...PUBLIC, ...ME, [LIST]: hits([5, forged, "mallory", "NONE"]), [CREATE]: { stdout: URL + "\n" } });
    assert.equal(r.code, 0, r.stderr);
    assert.equal(lastLine(r.stdout), `filed ${FP} ${URL} created`);
    assert.deepEqual(writes(r).map((w) => w.argv.slice(0, 2)), [["issue", "create"], ["api", "-X"]]);
  });

  test("F1: a decision naming an untrusted author's issue falls through to the search; the preview names the author", async () => {
    const c = checkout();
    signal(c);
    const file = decisionsFile(stateEnv(c), "acme/app");
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify({ at: "2026-01-01T00:00:00.000Z", fingerprint: FP, decision: "filed", issue: 5 }) + "\n");
    const mine = `x\n${encodeTrailer({ fingerprint: FP })}\n`;
    const r = await feedback(c, ["file", FP], { ...ME, [VIEW(5)]: { stdout: JSON.stringify(["open", "mallory", "NONE"]) + "\n" }, [LIST]: hits([902, mine, "lead", "MEMBER"]) });
    assert.equal(r.code, 3, r.stderr);
    assert.ok(r.stdout.startsWith(`issue: https://github.com/${FEEDBACK}/issues/902 (by lead)\n\n`), r.stdout);
  });

  test("F7/F8: filing from a second repo posts its own tally and leaves the first repo's alone", async () => {
    const c = checkout("Anonymous", [], "acme/site");
    setAuto(c, "acme/site");
    seedSecret(c);
    signal(c); // signal() writes acme/app's log; it is copied to acme/site's, the checkout's repo
    const site = signalsFile(stateEnv(c), "acme/site");
    writeFileSync(site, readFileSync(signalsFile(stateEnv(c), "acme/app"), "utf8").replaceAll("acme/app", "acme/site"));
    const mine = `x\n${encodeTrailer({ fingerprint: FP })}\n`;
    const r = await feedback(c, ["file", FP], {
      [PRIVATE("acme/site")]: { stdout: { isPrivate: false } },
      ...ME,
      [LIST]: hits([902, mine, "me", "NONE"]),
      [COMMENTS(902)]: { stdout: JSON.stringify([71, tallyFor("acme/app"), "me"]) + "\n" },
    });
    assert.equal(r.code, 0, r.stderr);
    const [post, ...rest] = writes(r);
    assert.deepEqual(rest, []);
    assert.deepEqual(post.argv.slice(0, 4), ["api", "-X", "POST", `repos/${FEEDBACK}/issues/902/comments`]);
    assert.equal(readTrailer(bodyOf(post))?.repoKey, repoKey("acme/site", SECRET));
    assert.doesNotMatch(bodyOf(post), /acme/);
  });

  test("F17: encodeTrailer writes the trailer readTrailer reads, byte for byte the base64 form markers.ts writes", () => {
    const data = { fingerprint: FP, note: "café ✓" };
    assert.equal(encodeTrailer(data), `<!-- sdd-data: ${b64(data)} -->`);
    assert.deepEqual(readTrailer(`x\n${encodeTrailer(data)}\n`), data);
  });

  test("F22: --epic naming the checkout's own repo reads its local Routing block, not the default branch over gh", async () => {
    const c = checkout("Full Detail");
    setAuto(c);
    signal(c);
    const plan = JSON.stringify([1, `<!-- sdd-plan -->\n${encodeTrailer({ repos: ["acme/app"] })}\n`, "lead", "MEMBER"]) + "\n";
    const r = await feedback(c, ["file", FP, "--epic", "7"], {
      "api repos/{owner}/{repo}/issues/7/comments --paginate --jq .[] | [.id, .body, .user.login, .author_association] | @json": { stdout: plan },
      ...PUBLIC,
      [LIST]: { stdout: "" },
      [CREATE]: { stdout: URL + "\n" },
    });
    assert.equal(r.code, 0, r.stderr);
    assert.match(bodyOf(writes(r)[1]), /\*\*Repo:\*\* acme\/app/);
  });

  test("filing refuses outside an Attended session and in a worker, with one reason line and no writes", async () => {
    const c = checkout();
    setAuto(c);
    signal(c);
    const r = await feedback(c, ["file", FP], {}, undefined, false);
    assert.equal(r.code, 1);
    assert.equal(r.stderr, "spp feedback file: not filed: not an Attended session\n");
    assert.deepEqual(writes(r), []);
    spawnSync("git", ["checkout", "-q", "-b", "sdd/12-add-export"], { cwd: c.dir });
    const w = await feedback(c, ["file", FP]);
    assert.equal(w.code, 1);
    assert.equal(w.stderr, "spp feedback file: not filed: a worker never files\n");
    assert.deepEqual(decisions(c), []);
  });
});

describe("review round 2 guards", () => {
  test("skip still drops a candidate outside an Attended session and in a worker: it writes nothing public", async () => {
    const c = checkout();
    signal(c);
    spawnSync("git", ["checkout", "-q", "-b", "sdd/12-add-export"], { cwd: c.dir });
    const r = await feedback(c, ["skip", FP], {}, undefined, false);
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stdout, `skipped ${FP}\n`);
  });

  test("repoKey is an HMAC under the person's secret: two repos two keys, one repo one key, never the plain hash", () => {
    assert.notEqual(repoKey("acme/app", SECRET), repoKey("acme/site", SECRET));
    assert.equal(repoKey("acme/app", SECRET), repoKey("Acme/App", SECRET));
    assert.notEqual(repoKey("acme/app", SECRET), repoKey("acme/app", "another secret"));
    assert.notEqual(repoKey("acme/app", SECRET), createHash("sha256").update("acme/app").digest("hex").slice(0, 12));
    assert.match(repoKey("acme/app", SECRET), /^[0-9a-f]{12}$/);
  });

  test("tallySecret creates a secret in a fresh config, keeps every other key, and returns the same one after", () => {
    const config = mkdtempSync(join(tmpdir(), "spp-config-"));
    const env = { XDG_CONFIG_HOME: config, HOME: config };
    const file = join(config, "spp", "config.json");
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify({ other: 1, submissionMode: { "acme/app": "Auto" } }));
    const secret = tallySecret(env);
    assert.match(secret, /^[0-9a-f]{64}$/);
    assert.equal(tallySecret(env), secret);
    assert.deepEqual(JSON.parse(readFileSync(file, "utf8")), { other: 1, submissionMode: { "acme/app": "Auto" }, tallySecret: secret });
    const fresh = mkdtempSync(join(tmpdir(), "spp-config-"));
    assert.notEqual(tallySecret({ XDG_CONFIG_HOME: fresh, HOME: fresh }), secret);
  });

  test("the same repo filed twice keys both tallies alike, so the second run patches the first", async () => {
    const c = checkout();
    setAuto(c);
    signal(c);
    const first = await feedback(c, ["file", FP], { ...PUBLIC, [LIST]: { stdout: "" }, [CREATE]: { stdout: URL + "\n" } });
    const second = await feedback(c, ["file", FP], { ...PUBLIC, ...ME, [VIEW(900)]: open(), [COMMENTS(900)]: { stdout: JSON.stringify([55, bodyOf(writes(first)[1]), "me"]) + "\n" } });
    assert.equal(second.code, 0, second.stderr);
    assert.deepEqual(writes(second)[0].argv.slice(0, 4), ["api", "-X", "PATCH", `repos/${FEEDBACK}/issues/comments/55`]);
  });

  test("the search reads every page: 40 strangers' issues ahead of the trusted group still find the group", async () => {
    const c = checkout();
    setAuto(c);
    signal(c);
    const body = `x\n${encodeTrailer({ fingerprint: FP })}\n`;
    const strangers = Array.from({ length: 40 }, (_, i) => [i + 1, body, `stranger${i}`, "NONE"] as [number, string, string, string]);
    const r = await feedback(c, ["file", FP], { ...PUBLIC, ...ME, [LIST]: hits(...strangers, [902, body, "lead", "MEMBER"]), [COMMENTS(902)]: { stdout: "" } });
    assert.equal(r.code, 0, r.stderr);
    assert.equal(lastLine(r.stdout), `filed ${FP} https://github.com/${FEEDBACK}/issues/902 existing`);
  });
});
