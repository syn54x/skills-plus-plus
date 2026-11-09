import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { beforeEach, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { issueRepo, parseIssue } from "../src/markers.ts";
import { fingerprint, recordDecision, recordSignal, runCounts, runsFile, type Signal, signalsFile } from "../src/signals.ts";
import { runCase } from "./harness.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const VERSION = (JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { version: string }).version;
const JQ = ".[] | [.id, .body, .user.login, .author_association] | @json";
const ISSUE = "https://github.com/acme/app/issues/12";
const EPIC = "https://github.com/acme/app/issues/197";
const PR = "https://github.com/acme/app/pull/5";
const HEAD = "ccccccc";
const LAST_EDITOR = "api graphql -f query=LastEditor -f owner=acme -f repo=app -F number=12";

const trailer = (data: unknown) => `<!-- sdd-data: ${Buffer.from(JSON.stringify(data)).toString("base64")} -->`;
const comments = (n: number) => `api repos/acme/app/issues/${n}/comments --paginate --jq ${JQ}`;
// One trusted comment row as the find query prints it.
const row = (id: number, body: string, login = "maint", association = "OWNER") => JSON.stringify([id, body, login, association]) + "\n";
const progress = (data: Record<string, unknown>) => row(900, `<!-- sdd-progress -->\n(rendered)\n${trailer(data)}\n`);
const maker = (skill: string, step?: string, version = VERSION) => ({ skill, version, ...(step && { step }) });

// The Verify block the lint fixture pins, and a pin for some other block.
const BODY = (JSON.parse(readFileSync(join(here, "fixtures", "lint", "hardened", "gh.json"), "utf8")) as Record<string, { stdout: { body: string } }>)["issue view 12 --json body,labels"].stdout.body;
const STALE_PIN = "f".repeat(64);

let state: string;
const log = () => signalsFile({ XDG_STATE_HOME: state, HOME: "" }, "acme/app");
const runs = () => runsFile({ XDG_STATE_HOME: state, HOME: "" }, "acme/app");
const signals = () => (existsSync(log()) ? readFileSync(log(), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as Signal) : []);

// Each case runs attended, CI unset, in a fresh state directory, unless the test changes process.env after this.
beforeEach(() => {
  state = mkdtempSync(join(tmpdir(), "spp-corrections-state-"));
  process.env.XDG_STATE_HOME = state;
  process.env.CLAUDE_CODE_SESSION_ATTENDED = "1";
  delete process.env.CI;
});

// A case directory: a checkout of acme/app (Signals go to the checkout's log), the arguments, gh's answers, and a
// Routing block with the Self-improvement mode.
function scratch(args: string[], gh: Record<string, unknown>, mode = "Anonymous", files: Record<string, string> = {}): string {
  const dir = mkdtempSync(join(tmpdir(), "spp-corrections-"));
  spawnSync("git", ["init", "-q"], { cwd: dir });
  spawnSync("git", ["remote", "add", "origin", "https://github.com/acme/app.git"], { cwd: dir });
  writeFileSync(join(dir, "args"), args.join("\n") + "\n");
  writeFileSync(join(dir, "gh.json"), JSON.stringify(gh));
  writeFileSync(join(dir, "CLAUDE.md"), `# app\n\n<!-- sdd-routing -->\n- Mode: org\n- Self-improvement mode: ${mode}\n<!-- /sdd-routing -->\n`);
  for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text);
  return dir;
}

// The four commands' cases, by command, each a function of the mode so a gate test can run it Off.
const verdictCase = (spec = "fail", mode?: string) =>
  scratch([PR, "--ticket", ISSUE, "--head", HEAD, "--spec", spec, "--quality", "pass"], {
    [`pr view ${PR} --json headRefOid --jq .headRefOid`]: { stdout: `${HEAD}${"0".repeat(33)}\n` },
    [comments(5)]: { stdout: "" },
    [comments(12)]: { stdout: progress({ status: "in-progress", by: maker("implement-issue", "fix") }) },
  }, mode);
const handBackCase = (route: string, reason: string, data: Record<string, unknown>, mode?: string, extra: string[] = []) =>
  scratch([ISSUE, route, "--reason", reason, ...extra], { [comments(12)]: { stdout: progress(data) } }, mode);
const deviationCase = (text: string, mode?: string) =>
  scratch([EPIC, "--add-deviation", text], {
    [comments(197)]: { stdout: row(700, `<!-- sdd-plan -->\n## Plan\n${trailer({ goal: "g", by: maker("to-tickets") })}\n`) },
    [comments(12)]: { stdout: progress({ verifyPin: "a".repeat(64), verifyPinBy: maker("harden") }) },
  }, mode);
const lintCase = (editor: { login: string; author: string; association: string } | null, mode?: string) =>
  scratch(["ticket", ISSUE], {
    [`issue view ${ISSUE} --json body,labels`]: { stdout: { body: BODY, labels: [{ name: "size:S" }] } },
    [comments(12)]: { stdout: progress({ verifyPin: STALE_PIN, verifyPinBy: maker("harden", "pin") }) },
    [LAST_EDITOR]: {
      stdout: {
        data: {
          viewer: { login: "maint" },
          repository: { issue: { author: { login: editor?.author ?? "maint" }, authorAssociation: editor?.association ?? "OWNER", userContentEdits: { nodes: editor ? [{ editor: { login: editor.login } }] : [] } } },
        },
      },
    },
  }, mode);

describe("happy path", () => {
  test("a failed verdict writes the verdict as before and records one fix-round charged to the progress by", async () => {
    const r = await runCase("verdict", verdictCase());
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stderr, "");
    assert.equal(r.writes.length, 1);
    const [s, ...rest] = signals();
    assert.deepEqual(rest, []);
    assert.deepEqual([s.category, s.skill, s.step, s.version, s.repo], ["fix-round", "implement-issue", "fix", VERSION, "acme/app"]);
    assert.equal(s.evidence, `${PR} head ${HEAD}: spec fail, quality pass`);
  });

  test("a passing verdict records no Signal", async () => {
    const r = await runCase("verdict", verdictCase("pass"));
    assert.equal(r.code, 0, r.stderr);
    assert.deepEqual(signals(), []);
  });

  test("needs-info records a brief-gap charged to verifyPinBy, its evidence holding route and reason", async () => {
    const r = await runCase("hand-back", handBackCase("needs-info", "no auth route", { verifyPinBy: maker("triage", "re-pin") }));
    assert.equal(r.code, 0, r.stderr);
    const [s, ...rest] = signals();
    assert.deepEqual(rest, []);
    assert.deepEqual([s.category, s.skill, s.step], ["brief-gap", "triage", "re-pin"]);
    assert.match(s.evidence, /needs-info: no auth route$/);
  });

  test("ready-for-human records a human-needed charged to the progress by stored before the Hand-back", async () => {
    const r = await runCase("hand-back", handBackCase("ready-for-human", "open findings", { by: maker("implement-issue", "fix round"), verifyPinBy: maker("harden") }));
    assert.equal(r.code, 0, r.stderr);
    const [s, ...rest] = signals();
    assert.deepEqual(rest, []);
    assert.deepEqual([s.category, s.skill, s.step], ["human-needed", "implement-issue", "fix round"]);
  });

  test("blocked with --blocked-by records a missed-edge charged to the verifyPinBy skill", async () => {
    const r = await runCase("hand-back", handBackCase("blocked", "r", { verifyPinBy: maker("harden") }, undefined, ["--blocked-by", "9"]));
    assert.equal(r.code, 0, r.stderr);
    assert.deepEqual(signals().map((s) => [s.category, s.skill]), [["missed-edge", "harden"]]);
  });

  test("a deviation leading with an issue URL records a contract-edited charged to that issue's verifyPinBy", async () => {
    const text = `${ISSUE}: f(a) -> f(a, b)`;
    const r = await runCase("plan", deviationCase(text));
    assert.equal(r.code, 0, r.stderr);
    const [s, ...rest] = signals();
    assert.deepEqual(rest, []);
    assert.deepEqual([s.category, s.skill, s.step], ["contract-edited", "harden", ""]);
    assert.equal(s.evidence, `${EPIC} deviation: ${text}`);
  });

  test("the ready gate's pin-match after an edit by the viewer exits 1 as today and records one contract-edited", async () => {
    const r = await runCase("lint", lintCase({ login: "maint", author: "someone", association: "NONE" }));
    assert.equal(r.code, 1, r.stderr);
    assert.match(r.stdout, /^pin-match: /);
    assert.equal(r.stderr, "");
    const [s, ...rest] = signals();
    assert.deepEqual(rest, []);
    assert.deepEqual([s.category, s.skill, s.step], ["contract-edited", "harden", "pin"]);
    assert.equal(s.evidence, `acme/app#12 Verify block no longer matches pin ${STALE_PIN.slice(0, 12)}`);
  });

  test("lint --pin on a passing ticket with no progress comment counts one harden run", async () => {
    const r = await runCase("lint", scratch(["ticket", ISSUE, "--pin", "body.md"], {
      [`issue view ${ISSUE} --json body,labels`]: { stdout: { body: BODY, labels: [{ name: "size:S" }] } },
      [comments(12)]: { stdout: "" },
    }, "Anonymous", { "body.md": BODY }));
    assert.equal(r.code, 0, r.stderr);
    assert.deepEqual(runCounts("acme/app", "harden", ""), { [VERSION]: 1 });
  });
});

describe("edge cases", () => {
  test("the same lint --pin again, on the comment it wrote, counts no second run", async () => {
    const gh = (stdout: string) => ({ [`issue view ${ISSUE} --json body,labels`]: { stdout: { body: BODY, labels: [{ name: "size:S" }] } }, [comments(12)]: { stdout } });
    const first = await runCase("lint", scratch(["ticket", ISSUE, "--pin", "body.md"], gh(""), "Anonymous", { "body.md": BODY }));
    const written = (first.writes[0] as { argv: string[] }).argv.find((a) => a.startsWith("body="))!.slice(5);
    const again = await runCase("lint", scratch(["ticket", ISSUE, "--pin", "body.md"], gh(row(900, written)), "Anonymous", { "body.md": BODY }));
    assert.equal(again.code, 0, again.stderr);
    assert.deepEqual(runCounts("acme/app", "harden", ""), { [VERSION]: 1 });
  });

  test("spp progress --status pr-open on a comment harden last wrote counts one implement-issue run", async () => {
    const r = await runCase("progress", scratch([ISSUE, "--status", "pr-open"], { [comments(12)]: { stdout: progress({ verifyPin: "a".repeat(64), by: maker("harden") }) } }));
    assert.equal(r.code, 0, r.stderr);
    assert.deepEqual(runCounts("acme/app", "implement-issue", ""), { [VERSION]: 1 });
    const [run] = readFileSync(runs(), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as Record<string, string>);
    assert.equal(run.artifact, "acme/app#12 <!-- sdd-progress -->");
  });

  test("a write that keeps the same maker counts no run", async () => {
    const r = await runCase("progress", scratch([ISSUE, "--status", "pr-open"], { [comments(12)]: { stdout: progress({ by: maker("implement-issue") }) } }));
    assert.equal(r.code, 0, r.stderr);
    assert.equal(existsSync(runs()), false);
  });

  test("runCounts is {} when there is no runs file", () => {
    assert.deepEqual(runCounts("acme/app", "harden", ""), {});
  });

  test("a reason starting worker lost records no Signal", async () => {
    for (const route of ["needs-info", "ready-for-human"]) {
      const r = await runCase("hand-back", handBackCase(route, "worker lost: no heartbeat", { by: maker("implement-issue"), verifyPinBy: maker("harden") }));
      assert.equal(r.code, 0, r.stderr);
    }
    assert.deepEqual(signals(), []);
  });

  test("a trailer with no verifyPinBy charges harden, step empty, at the running version", async () => {
    const r = await runCase("hand-back", handBackCase("needs-info", "r", { verifyPin: "a".repeat(64) }));
    assert.equal(r.code, 0, r.stderr);
    assert.deepEqual(signals().map((s) => [s.skill, s.step, s.version]), [["harden", "", VERSION]]);
  });

  test("a verifyPinBy made by another version charges that version", async () => {
    const r = await runCase("hand-back", handBackCase("needs-info", "r", { verifyPinBy: maker("harden", undefined, "0.0.1") }));
    assert.equal(r.code, 0, r.stderr);
    assert.deepEqual(signals().map((s) => s.version), ["0.0.1"]);
  });

  test("a deviation naming no issue is charged to the plan comment's maker", async () => {
    const r = await runCase("plan", deviationCase("no issue named"));
    assert.equal(r.code, 0, r.stderr);
    assert.deepEqual(signals().map((s) => [s.category, s.skill, s.evidence]), [["contract-edited", "to-tickets", `${EPIC} deviation: no issue named`]]);
  });

  test("#N, N and owner/repo#N lead a deviation as an issue does", async () => {
    for (const lead of ["#12:", "12", "acme/app#12:"]) {
      const r = await runCase("plan", deviationCase(`${lead} f(a) -> f(a, b)`));
      assert.equal(r.code, 0, r.stderr);
    }
    assert.deepEqual(signals().map((s) => s.skill), ["harden", "harden", "harden"]);
  });

  test("the same failing verdict twice leaves one Signal", async () => {
    const dir = verdictCase();
    for (let i = 0; i < 2; i++) assert.equal((await runCase("verdict", dir)).code, 0);
    assert.equal(signals().length, 1);
  });

  test("pin-match after an edit by a stranger, by the author with association NONE, or with no edit records nothing", async () => {
    for (const editor of [{ login: "stranger", author: "someone", association: "OWNER" }, { login: "someone", author: "someone", association: "NONE" }, null]) {
      const r = await runCase("lint", lintCase(editor));
      assert.equal(r.code, 1);
      assert.equal(r.stderr, "");
    }
    assert.deepEqual(signals(), []);
  });

  test("the author editing with a trusted association is trusted", async () => {
    const r = await runCase("lint", lintCase({ login: "someone", author: "someone", association: "MEMBER" }));
    assert.equal(r.code, 1);
    assert.equal(signals().length, 1);
  });

  test("under CI, outside an Attended session, or with mode Off: no Signal or runs file, and the same writes as Off", async () => {
    // gh answers nothing only a Signal would read, so any such call would show on stderr as a Signal not recorded.
    const without = (dir: string, key: string) => {
      const gh = JSON.parse(readFileSync(join(dir, "gh.json"), "utf8")) as Record<string, unknown>;
      delete gh[key];
      writeFileSync(join(dir, "gh.json"), JSON.stringify(gh));
      return dir;
    };
    const cases: [string, (mode?: string) => string, number][] = [
      ["verdict", (m) => without(verdictCase("fail", m), comments(12)), 0],
      ["hand-back", (m) => handBackCase("ready-for-human", "r", { by: maker("harden") }, m), 0],
      ["plan", (m) => without(deviationCase("#12: x", m), comments(12)), 0],
      ["lint", (m) => without(lintCase({ login: "maint", author: "maint", association: "OWNER" }, m), LAST_EDITOR), 1],
    ];
    for (const [command, make, code] of cases) {
      const off = await runCase(command, make("Off"));
      assert.equal(off.code, code, off.stderr);
      for (const env of [{ CI: "true" }, { CLAUDE_CODE_SESSION_ATTENDED: "" }, {}]) {
        Object.assign(process.env, env);
        const r = await runCase(command, make(Object.keys(env).length ? "Anonymous" : "Off"));
        delete process.env.CI;
        process.env.CLAUDE_CODE_SESSION_ATTENDED = "1";
        assert.deepEqual([r.code, r.stdout, r.stderr, r.writes], [off.code, off.stdout, off.stderr, off.writes], `${command} ${JSON.stringify(env)}`);
      }
    }
    assert.equal(existsSync(log()), false);
    assert.equal(existsSync(runs()), false);
  });
});

describe("references as typed", () => {
  // A verdict whose --ticket is written `ticket`, with gh answering the progress lookup on acme/app#12.
  const verdictWith = (ticket: string, mode?: string) => {
    const dir = verdictCase("fail", mode);
    writeFileSync(join(dir, "args"), [PR, "--ticket", ticket, "--head", HEAD, "--spec", "fail", "--quality", "pass"].join("\n") + "\n");
    return dir;
  };

  test("an owner/repo#N or trailing-slash --ticket keeps the verdict's exit code under CI, Off and attended", async () => {
    for (const ticket of ["acme/app#12", `${ISSUE}/`]) {
      process.env.CI = "true";
      const ci = await runCase("verdict", verdictWith(ticket));
      delete process.env.CI;
      const off = await runCase("verdict", verdictWith(ticket, "Off"));
      const on = await runCase("verdict", verdictWith(ticket));
      for (const r of [ci, off, on]) assert.deepEqual([r.code, r.stderr], [0, ""], ticket);
    }
    assert.deepEqual(signals().map((s) => [s.category, s.skill, s.step]), [["fix-round", "implement-issue", "fix"]]);
  });

  test("a --ticket that names no issue leaves the exit code and says the Signal was not recorded", async () => {
    const r = await runCase("verdict", verdictWith("not-an-issue"));
    assert.equal(r.code, 0);
    assert.match(r.stderr, /^spp verdict: signal not recorded: .*not-an-issue\n$/);
    assert.deepEqual(signals(), []);
  });

  test("pin-match on the same issue as a number and as a URL counts once", async () => {
    const url = await runCase("lint", lintCase({ login: "maint", author: "maint", association: "OWNER" }));
    assert.equal(url.code, 1, url.stderr);
    // The same issue as a bare number, in a checkout whose origin is acme/app.
    const dir = mkdtempSync(join(tmpdir(), "spp-corrections-"));
    spawnSync("git", ["init", "-q"], { cwd: dir });
    spawnSync("git", ["remote", "add", "origin", "https://github.com/acme/app.git"], { cwd: dir });
    const gh = JSON.parse(readFileSync(join(lintCase(null), "gh.json"), "utf8")) as Record<string, unknown>;
    const bare = {
      "issue view 12 --json body,labels": gh[`issue view ${ISSUE} --json body,labels`],
      "api repos/{owner}/{repo}/issues/12/comments --paginate --jq .[] | [.id, .body, .user.login, .author_association] | @json": gh[comments(12)],
      "api graphql -f query=LastEditor -F owner={owner} -F repo={repo} -F number=12": {
        stdout: { data: { viewer: { login: "maint" }, repository: { issue: { author: { login: "maint" }, authorAssociation: "OWNER", userContentEdits: { nodes: [{ editor: { login: "maint" } }] } } } } },
      },
    };
    writeFileSync(join(dir, "args"), "ticket\n12\n");
    writeFileSync(join(dir, "gh.json"), JSON.stringify(bare));
    writeFileSync(join(dir, "CLAUDE.md"), "# app\n\n<!-- sdd-routing -->\n- Mode: org\n- Self-improvement mode: Anonymous\n<!-- /sdd-routing -->\n");
    const r = await runCase("lint", dir);
    assert.deepEqual([r.code, r.stderr], [1, ""]);
    assert.equal(signals().length, 1);
  });
});

describe("error paths", () => {
  test("a Signal log that cannot be written after the three Hand-back steps: exit 0, the steps done, signal not recorded on stderr", async () => {
    const blocker = join(mkdtempSync(join(tmpdir(), "spp-corrections-blocker-")), "file");
    writeFileSync(blocker, "x");
    process.env.XDG_STATE_HOME = join(blocker, "state");
    const r = await runCase("hand-back", handBackCase("needs-info", "r", { verifyPinBy: maker("harden") }));
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.writes.length, 3);
    assert.match(r.stderr, /^spp hand-back: signal not recorded: .*(ENOTDIR|EEXIST)/);
  });
});

describe("fix round (Refs #342)", () => {
  const OTHER_PR = "https://github.com/acme/other/pull/5";
  const OTHER_ISSUE = "https://github.com/acme/other/issues/12";
  const otherComments = `api repos/acme/other/issues/12/comments --paginate --jq ${JQ}`;
  const routing = (mode: string) => `# other\n\n<!-- sdd-routing -->\n- Mode: org\n- Self-improvement mode: ${mode}\n<!-- /sdd-routing -->\n`;
  const contents = (file: string) => `api repos/acme/other/contents/${file} -H Accept: application/vnd.github.raw`;
  const otherLog = () => signalsFile({ XDG_STATE_HOME: state, HOME: "" }, "acme/other");
  const otherRuns = () => runsFile({ XDG_STATE_HOME: state, HOME: "" }, "acme/other");

  // F10, F11 and the Spec finding: a correction on another repo's issue went to that repo's log, gated by the checkout's mode.
  test("a failed verdict on another repo's ticket: nothing when that repo is Off, else one Signal in the checkout's log", async () => {
    const verdictOn = (otherMode: string) =>
      scratch([OTHER_PR, "--ticket", OTHER_ISSUE, "--head", HEAD, "--spec", "fail", "--quality", "pass"], {
        [`pr view ${OTHER_PR} --json headRefOid --jq .headRefOid`]: { stdout: `${HEAD}${"0".repeat(33)}\n` },
        [`api repos/acme/other/issues/5/comments --paginate --jq ${JQ}`]: { stdout: "" },
        [otherComments]: { stdout: progress({ by: maker("implement-issue", "fix") }) },
        [contents("CLAUDE.md")]: { stdout: routing(otherMode) },
      });
    const off = await runCase("verdict", verdictOn("Off"));
    assert.deepEqual([off.code, off.stderr], [0, ""]);
    assert.deepEqual([existsSync(log()), existsSync(otherLog())], [false, false]);
    const on = await runCase("verdict", verdictOn("Full Detail"));
    assert.deepEqual([on.code, on.stderr], [0, ""]);
    assert.equal(existsSync(otherLog()), false);
    assert.deepEqual(signals().map((s) => [s.repo, s.category, s.evidence]), [["acme/app", "fix-round", `${OTHER_PR} head ${HEAD}: spec fail, quality pass`]]);
  });

  test("a run on another repo's issue: none when that repo is Off, else one in the checkout's runs log", async () => {
    const progressOn = (otherMode: string) =>
      scratch([OTHER_ISSUE, "--status", "pr-open"], { [otherComments]: { stdout: progress({ by: maker("harden") }) }, [contents("CLAUDE.md")]: { stdout: routing(otherMode) } });
    assert.equal((await runCase("progress", progressOn("Off"))).code, 0);
    assert.deepEqual([existsSync(runs()), existsSync(otherRuns())], [false, false]);
    assert.equal((await runCase("progress", progressOn("Anonymous"))).code, 0);
    assert.equal(existsSync(otherRuns()), false);
    const [run, ...rest] = readFileSync(runs(), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as Record<string, string>);
    assert.deepEqual(rest, []);
    assert.deepEqual([run.repo, run.artifact], ["acme/app", "acme/other#12 <!-- sdd-progress -->"]);
  });

  // F12 to F15: the caller checked only pending candidates, so a filed one got the same evidence again.
  test("the same failing verdict after its candidate was filed leaves one Signal", async () => {
    const dir = verdictCase();
    assert.equal((await runCase("verdict", dir)).code, 0);
    recordDecision("acme/app", { fingerprint: signals()[0].fingerprint, decision: "filed", issue: 1 });
    assert.equal((await runCase("verdict", dir)).code, 0);
    assert.equal(signals().length, 1);
  });

  // Round 2: the Signal kept no mode, so filing could not take the lower of the two.
  test("a Signal about an Anonymous repo's issue in a Full Detail checkout carries Anonymous; a same-repo one carries no mode", async () => {
    const other = scratch([OTHER_ISSUE, "needs-info", "--reason", "r"], {
      [otherComments]: { stdout: progress({ verifyPinBy: maker("harden") }) },
      [contents("CLAUDE.md")]: { stdout: routing("Anonymous") },
    }, "Full Detail");
    assert.deepEqual([(await runCase("hand-back", other)).stderr], [""]);
    assert.equal((await runCase("hand-back", handBackCase("blocked", "r", { verifyPinBy: maker("harden") }, "Full Detail"))).code, 0);
    assert.deepEqual(signals().map((s) => [s.category, s.mode]), [["brief-gap", "Anonymous"], ["missed-edge", undefined]]);
    assert.equal("mode" in signals()[1], false);
  });

  // Round 2: a record about another repo, named by a bare number, asked git for the origin three times.
  test("a record about another repo asks git for the checkout's origin once", async () => {
    const dir = scratch([], { [contents("CLAUDE.md")]: { stdout: routing("Anonymous") } });
    const bin = mkdtempSync(join(tmpdir(), "spp-git-"));
    const calls = join(bin, "calls");
    const real = spawnSync("sh", ["-c", "command -v git"], { encoding: "utf8" }).stdout.trim();
    writeFileSync(join(bin, "git"), `#!/bin/sh\necho "$*" >> "${calls}"\nexec "${real}" "$@"\n`, { mode: 0o755 });
    const saved = { PATH: process.env.PATH, SPP_CASE: process.env.SPP_CASE };
    Object.assign(process.env, { PATH: `${bin}${delimiter}${join(root, "spp", "test", "stubs")}${delimiter}${saved.PATH}`, SPP_CASE: dir });
    try {
      const r = await recordSignal((own) => ({ about: "acme/other", category: "wish", skill: "triage", evidence: `${issueRepo(parseIssue("12"), own)}#12` }), process.env, dir);
      assert.ok("signal" in r, JSON.stringify(r));
    } finally {
      process.env.PATH = saved.PATH;
      if (saved.SPP_CASE === undefined) delete process.env.SPP_CASE;
      else process.env.SPP_CASE = saved.SPP_CASE;
    }
    assert.equal(readFileSync(calls, "utf8").split("\n").filter((l) => l === "remote get-url origin").length, 1);
  });

  // F16: the Hand-back read the progress comment once for its write and again for the Signal.
  test("a Hand-back reads the progress comment once: a second read failing still records its Signal", async () => {
    const dir = scratch([ISSUE, "needs-info", "--reason", "r"], { [comments(12)]: [{ stdout: progress({ verifyPinBy: maker("harden") }) }, { stderr: "HTTP 502", code: 1 }] });
    const r = await runCase("hand-back", dir);
    assert.deepEqual([r.code, r.stderr, r.writes.length], [0, "", 3]);
    assert.deepEqual(signals().map((s) => [s.category, s.skill]), [["brief-gap", "harden"]]);
  });
});

describe("integration", () => {
  test("spp feedback pending --json lists one candidate per fingerprint from the verdict, Hand-back and deviation cases", async () => {
    assert.equal((await runCase("verdict", verdictCase())).code, 0);
    assert.equal((await runCase("hand-back", handBackCase("needs-info", "no auth route", { verifyPinBy: maker("triage", "re-pin") }))).code, 0);
    assert.equal((await runCase("hand-back", handBackCase("ready-for-human", "open findings", { by: maker("implement-issue") }))).code, 0);
    assert.equal((await runCase("plan", deviationCase(`${ISSUE}: f(a) -> f(a, b)`))).code, 0);
    const checkout = mkdtempSync(join(tmpdir(), "spp-corrections-checkout-"));
    spawnSync("git", ["init", "-q"], { cwd: checkout });
    spawnSync("git", ["remote", "add", "origin", "https://github.com/acme/app.git"], { cwd: checkout });
    const r = spawnSync(process.execPath, [join(root, "bin", "spp"), "feedback", "pending", "--json"], { cwd: checkout, encoding: "utf8" });
    assert.equal(r.status, 0, r.stderr);
    const got = (JSON.parse(r.stdout) as { fingerprint: string; skill: string; step: string; category: string; count: number }[]).map((c) => [c.skill, c.step, c.category, c.count, c.fingerprint]);
    const want = ([["implement-issue", "fix", "fix-round"], ["triage", "re-pin", "brief-gap"], ["implement-issue", "", "human-needed"], ["harden", "", "contract-edited"]] as const).map(
      ([skill, step, category]) => [skill, step, category, 1, fingerprint(skill, step, category)],
    );
    assert.deepEqual(new Set(got.map((g) => JSON.stringify(g))), new Set(want.map((w) => JSON.stringify(w))));
  });
});
