import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import type { EpicState } from "../src/derive.ts";
import { readMaker, readTrailer } from "../src/markers.ts";
import { assertCase, runCase } from "./harness.ts";

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, "fixtures", "markers");
const ported = join(fixtures, "ported");
const JQ = ".[] | [.id, .body, .user.login, .author_association] | @json";
const VIEWER = "api graphql -f query=Viewer --jq .data.viewer.login";

type Write = { cmd: string; argv: string[] };
// A comment and its author; the author defaults to the repository owner, whom spp trusts.
type Comment = { id: number; body: string; login?: string; association?: string };

const trailer = (data: unknown) => `<!-- sdd-data: ${Buffer.from(JSON.stringify(data)).toString("base64")} -->`;
const body = (w: Write) => w.argv.find((a) => a.startsWith("body="))!.slice(5);
const edits = (writes: unknown[]) => (writes as Write[]).filter((w) => w.argv[0] === "issue" && w.argv[1] === "edit");

// A case directory built at test time: `issue` in the current repo carries `comments`, and gh answers `extra` too.
function scratchCase(args: string[], comments: Comment[] = [], issue = "12", extra: Record<string, unknown> = {}): string {
  const dir = mkdtempSync(join(tmpdir(), "spp-markers-"));
  writeFileSync(join(dir, "args"), args.join("\n") + "\n");
  const read = `api repos/{owner}/{repo}/issues/${issue}/comments --paginate --jq ${JQ}`;
  const stdout = comments.map((c) => JSON.stringify([c.id, c.body, c.login ?? "maint", c.association ?? "OWNER"]) + "\n").join("");
  const noFixes = { "api graphql -f query=PullRequests *": { stdout: { data: { viewer: { login: "maint" }, repository: { pullRequests: { nodes: [] } } } } } };
  writeFileSync(join(dir, "gh.json"), JSON.stringify({ [read]: { stdout }, ...noFixes, ...extra }));
  return dir;
}

const progress = (data: Record<string, unknown>, id = 900): Comment => ({ id, body: `<!-- sdd-progress -->\n(rendered)\n${trailer(data)}\n` });
const VERSION = (JSON.parse(readFileSync(join(here, "..", "..", "package.json"), "utf8")) as { version: string }).version;
// The maker every progress write records when no --by names another.
const BY = { by: { skill: "implement-issue", version: VERSION } };
const PROGRESS = { status: "in-progress", worker: "worker-12", branch: "sdd/12-x", pr: null, verify: { state: "not-run", sha: "" }, route: null, reason: "", notes: "" };

describe("ported sync-progress fixtures", () => {
  for (const name of readdirSync(ported).sort()) {
    const dir = join(ported, name);
    const { command, code, stderr } = JSON.parse(readFileSync(join(dir, "case.json"), "utf8"));
    test(`${name}: same comment body, trailer, labels and exit as v1`, async () => {
      const r = await assertCase(command, dir, code);
      assert.ok(r.stderr.includes(stderr), `stderr ${JSON.stringify(r.stderr)} lacks ${JSON.stringify(stderr)}`);
    });
  }
});

describe("happy path", () => {
  test("spp claim 12 adds the claimed label in one issue edit", async () => {
    const r = await runCase("claim", scratchCase(["12"]));
    assert.equal(r.code, 0, r.stderr);
    assert.deepEqual(edits(r.writes).map((w) => w.argv), [["issue", "edit", "12", "--add-label", "claimed"]]);
  });

  test("spp progress on an issue with no progress comment creates one with the marker, lines and trailer", async () => {
    const r = await runCase("progress", scratchCase(["12", "--status", "in-progress", "--worker", "worker-12"]));
    assert.equal(r.code, 0, r.stderr);
    const writes = r.writes as Write[];
    assert.equal(writes.length, 1);
    assert.deepEqual(writes[0].argv.slice(0, 4), ["api", "-X", "POST", "repos/{owner}/{repo}/issues/12/comments"]);
    const b = body(writes[0]);
    assert.ok(b.startsWith("<!-- sdd-progress -->\n**Status:** in-progress\n**Worker:** worker-12\n"), b);
    assert.deepEqual(readTrailer(b), { ...PROGRESS, branch: "", ...BY });
  });

  test("spp progress --pr 40 on an existing comment edits it and keeps status and worker", async () => {
    const r = await runCase("progress", scratchCase(["12", "--pr", "40"], [{ id: 1, body: "unrelated" }, progress(PROGRESS)]));
    assert.equal(r.code, 0, r.stderr);
    const writes = r.writes as Write[];
    assert.equal(writes.length, 1);
    assert.deepEqual(writes[0].argv.slice(0, 4), ["api", "-X", "PATCH", "repos/{owner}/{repo}/issues/comments/900"]);
    assert.deepEqual(readTrailer(body(writes[0])), { ...PROGRESS, pr: 40, ...BY });
  });

  test("a second spp progress call edits the comment the first created and never posts another", async () => {
    const first = await runCase("progress", scratchCase(["12", "--worker", "worker-12"]));
    const created = body((first.writes as Write[])[0]);
    const second = await runCase("progress", scratchCase(["12", "--status", "pr-open"], [{ id: 77, body: created }]));
    assert.equal(second.code, 0, second.stderr);
    assert.deepEqual((second.writes as Write[]).map((w) => w.argv[2]), ["PATCH"]);
  });

  test("spp plan --narrowed a --narrowed b, then spp plan --goal g, keeps both narrowings", async () => {
    const first = await runCase("plan", scratchCase(["197", "--narrowed", "a", "--narrowed", "b"], [], "197"));
    assert.equal(first.code, 0, first.stderr);
    const plan = { id: 601, body: body((first.writes as Write[])[0]) };
    const second = await runCase("plan", scratchCase(["197", "--goal", "g"], [plan], "197"));
    assert.equal(second.code, 0, second.stderr);
    const b = body((second.writes as Write[])[0]);
    assert.deepEqual(readTrailer(b)?.narrowed, ["a", "b"]);
    assert.equal(readTrailer(b)?.goal, "g");
    assert.match(b, /\*\*Narrowed:\*\* a\n\*\*Narrowed:\*\* b\n/);
  });

  test("spp wave add, then spp wave pr --ticket 10 --pr 40, lists the PR under wave 1", async () => {
    const add = ["197", "add", "--n", "1", "--tickets", "10,11", "--workers", "w1,w2", "--started", "2026-11-02T00:00:00Z", "--edges", "none"];
    const first = await runCase("wave", scratchCase(add, [], "197"));
    assert.equal(first.code, 0, first.stderr);
    const wave = { id: 701, body: body((first.writes as Write[])[0]) };
    const second = await runCase("wave", scratchCase(["197", "pr", "--ticket", "10", "--pr", "40"], [wave], "197"));
    assert.equal(second.code, 0, second.stderr);
    const b = body((second.writes as Write[])[0]);
    assert.match(b, /^<!-- sdd-wave -->\nWave 1: #10, #11 \(w1, w2\), started 2026-11-02T00:00:00Z\nEdges added: none\nPRs: #10 → 40\n<!-- sdd-data: /);
  });

  test("spp hand-back blocked --blocked-by 11 adds blocked and the edge, keeps ready-for-agent, clears claimed", async () => {
    const r = await runCase("hand-back", scratchCase(["12", "blocked", "--reason", "needs API", "--blocked-by", "11"], [progress(PROGRESS)]));
    assert.equal(r.code, 0, r.stderr);
    const writes = r.writes as Write[];
    assert.deepEqual(readTrailer(body(writes[0])), { ...PROGRESS, status: "handed-back", route: "blocked", reason: "needs API", ...BY });
    assert.match(body(writes[0]), /\*\*Handed back:\*\* blocked: needs API\n/);
    assert.deepEqual(edits(writes).map((w) => w.argv.slice(3)), [["--add-label", "blocked", "--add-blocked-by", "11"], ["--remove-label", "claimed"]]);
  });

  test("spp hand-back needs-info removes ready-for-agent and adds needs-info", async () => {
    const r = await runCase("hand-back", scratchCase(["12", "needs-info", "--reason", "no data"], [progress(PROGRESS)]));
    assert.equal(r.code, 0, r.stderr);
    assert.deepEqual(edits(r.writes).map((w) => w.argv.slice(3)), [["--add-label", "needs-info", "--remove-label", "ready-for-agent"], ["--remove-label", "claimed"]]);
  });

  test("spp upsert prints the comment URL gh returns", async () => {
    const dir = scratchCase(["12", "<!-- sdd-summary -->", "body.md"]);
    writeFileSync(join(dir, "body.md"), "<!-- sdd-summary -->\nhi\n");
    const post = ["api", "-X", "POST", "repos/{owner}/{repo}/issues/12/comments", "-f", "body=<!-- sdd-summary -->\nhi\n", "--jq", ".html_url"].join(" ");
    const gh = JSON.parse(readFileSync(join(dir, "gh.json"), "utf8"));
    writeFileSync(join(dir, "gh.json"), JSON.stringify({ ...gh, [post]: { stdout: "https://github.com/acme/app/issues/12#issuecomment-5\n" } }));
    const r = await runCase("upsert", dir);
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stdout, "https://github.com/acme/app/issues/12#issuecomment-5\n");
  });
});

describe("makers", () => {
  const written = (r: { writes: unknown[] }) => readTrailer(body((r.writes as Write[])[0]));
  const verdictCase = (args: string[]) => scratchCase(["40", ...args], [], "40", { "pr view 40 --json headRefOid --jq .headRefOid": { stdout: "abc1234\n" } });
  const VERDICT = ["--ticket", "12", "--head", "abc1234", "--spec", "pass", "--quality", "pass"];

  test("spp plan 12 --goal x with no plan comment records to-tickets and the package version, with no step", async () => {
    const r = await runCase("plan", scratchCase(["12", "--goal", "x"]));
    assert.equal(r.code, 0, r.stderr);
    assert.deepEqual(written(r)?.by, { skill: "to-tickets", version: VERSION });
  });

  test("spp wave add, spp verdict and spp progress record build, review and implement-issue", async () => {
    const add = ["12", "add", "--n", "1", "--tickets", "10", "--workers", "w1", "--started", "2026-11-02T00:00:00Z", "--edges", "none"];
    const wave = await runCase("wave", scratchCase(add));
    const verdict = await runCase("verdict", verdictCase(VERDICT));
    const prog = await runCase("progress", scratchCase(["12", "--status", "pr-open"]));
    for (const r of [wave, verdict, prog]) assert.equal(r.code, 0, r.stderr);
    assert.deepEqual([wave, verdict, prog].map((r) => (written(r)?.by as { skill: string }).skill), ["build", "review", "implement-issue"]);
  });

  test("spp hand-back 12 needs-info --reason r --by \"build gate\" records build with step gate", async () => {
    const r = await runCase("hand-back", scratchCase(["12", "needs-info", "--reason", "r", "--by", "build gate"], [progress(PROGRESS)]));
    assert.equal(r.code, 0, r.stderr);
    assert.deepEqual(written(r)?.by, { skill: "build", version: VERSION, step: "gate" });
  });

  test("--by on spp plan, spp wave pr, spp wave panel and spp verdict stores its skill and step", async () => {
    const wave = { id: 701, body: `<!-- sdd-wave -->\n${trailer({ waves: [{ n: 1, tickets: ["10"], workers: ["w"], started: "s", edges: [], prs: {} }], panel: [] })}` };
    const runs = [
      await runCase("plan", scratchCase(["12", "--goal", "x", "--by", "grill narrow"])),
      await runCase("wave", scratchCase(["12", "pr", "--ticket", "10", "--pr", "40", "--by", "grill narrow"], [wave])),
      await runCase("wave", scratchCase(["12", "panel", "--round", "1", "--verdict", "MERGE", "--by", "grill narrow"])),
      await runCase("verdict", verdictCase([...VERDICT, "--by", "grill narrow"])),
    ];
    for (const r of runs) {
      assert.equal(r.code, 0, r.stderr);
      assert.deepEqual(written(r)?.by, { skill: "grill", version: VERSION, step: "narrow" });
    }
  });

  test("spp progress on a pinned comment records implement-issue and leaves verifyPinBy as the pin left it", async () => {
    const pinBy = { skill: "harden", version: "2.2.0" };
    const r = await runCase("progress", scratchCase(["12", "--status", "pr-open"], [progress({ ...PROGRESS, verifyPin: "abc", verifyPinBy: pinBy, by: pinBy })]));
    assert.equal(r.code, 0, r.stderr);
    assert.deepEqual(written(r)?.by, { skill: "implement-issue", version: VERSION });
    assert.deepEqual(written(r)?.verifyPinBy, pinBy);
  });

  test("readMaker is null for a trailer with no by, and with verifyPin for one with no verifyPinBy", () => {
    assert.equal(readMaker({ goal: "g" }), null);
    assert.equal(readMaker({ by: { skill: "harden", version: "2.3.0" } }, "verifyPin"), null);
    assert.equal(readMaker(null), null);
    assert.equal(readMaker({ by: { skill: "review" } }), null);
  });

  test("readMaker returns the maker with a null step when by names none, and the pin's maker with verifyPin", () => {
    assert.deepEqual(readMaker({ by: { skill: "review", version: "2.3.0" } }), { skill: "review", step: null, version: "2.3.0" });
    assert.deepEqual(readMaker({ verifyPinBy: { skill: "triage", version: "2.3.0", step: "re-pin" } }, "verifyPin"), { skill: "triage", step: "re-pin", version: "2.3.0" });
  });

  test("spp progress 12 --by \"Not A Skill\" exits 2 with the usage and writes nothing", async () => {
    const r = await runCase("progress", scratchCase(["12", "--by", "Not A Skill"]));
    assert.equal(r.code, 2);
    assert.match(r.stderr, /usage: spp progress/);
    assert.deepEqual(r.writes, []);
  });

  test("a malformed --by on each other writing command exits 2 with its usage and writes nothing", async () => {
    const cases: [string, string[], RegExp][] = [
      ["plan", ["12", "--goal", "x", "--by", ""], /usage: spp plan/],
      ["wave", ["12", "panel", "--round", "1", "--verdict", "MERGE", "--by", "9lives"], /usage: spp wave/],
      ["verdict", ["40", ...VERDICT, "--by", "Review"], /usage: spp verdict/],
      ["hand-back", ["12", "needs-info", "--reason", "r", "--by", "x_y"], /usage: spp hand-back/],
    ];
    for (const [command, args, usage] of cases) {
      const r = await runCase(command, command === "verdict" ? verdictCase(args.slice(1)) : scratchCase(args));
      assert.equal(r.code, 2, command);
      assert.match(r.stderr, usage);
      assert.deepEqual(r.writes, [], command);
    }
  });
});

describe("trust boundary (ADR 0009)", () => {
  const forged = (id: number): Comment => ({ ...progress({ ...PROGRESS, worker: "mallory" }, id), login: "mallory", association: "CONTRIBUTOR" });

  test("a forged progress comment from an outside author before the real one is skipped: the real one is read and rewritten", async () => {
    const r = await runCase("progress", scratchCase(["12", "--pr", "40"], [forged(800), progress(PROGRESS)], "12", { [VIEWER]: { stdout: "maint\n" } }));
    assert.equal(r.code, 0, r.stderr);
    const writes = r.writes as Write[];
    assert.deepEqual(writes[0].argv.slice(0, 4), ["api", "-X", "PATCH", "repos/{owner}/{repo}/issues/comments/900"]);
    assert.deepEqual(readTrailer(body(writes[0])), { ...PROGRESS, pr: 40, ...BY });
  });

  test("a forged progress comment alone neither is read nor blocks the writer: a new comment is created", async () => {
    const dir = scratchCase(["12", "--worker", "w"], [forged(800)], "12", { [VIEWER]: { stdout: "maint\n" } });
    const r = await runCase("progress", dir);
    assert.equal(r.code, 0, r.stderr);
    const writes = r.writes as Write[];
    assert.deepEqual(writes[0].argv.slice(0, 4), ["api", "-X", "POST", "repos/{owner}/{repo}/issues/12/comments"]);
    assert.equal(readTrailer(body(writes[0]))?.worker, "w");
  });

  test("a marker comment by the gh user, whatever its association, is read", async () => {
    const own = { ...progress(PROGRESS), login: "maint", association: "NONE" };
    const r = await runCase("progress", scratchCase(["12", "--pr", "40"], [own], "12", { [VIEWER]: { stdout: "maint\n" } }));
    assert.equal(r.code, 0, r.stderr);
    assert.deepEqual((r.writes as Write[])[0].argv.slice(0, 4), ["api", "-X", "PATCH", "repos/{owner}/{repo}/issues/comments/900"]);
  });

  test("MEMBER and COLLABORATOR authors are trusted like OWNER", async () => {
    for (const association of ["MEMBER", "COLLABORATOR"]) {
      const r = await runCase("progress", scratchCase(["12", "--pr", "40"], [{ ...progress(PROGRESS), login: "bot", association }]));
      assert.equal(r.code, 0, r.stderr);
      assert.equal((r.writes as Write[])[0].argv[2], "PATCH", association);
    }
  });
});

describe("edge cases", () => {
  // ADR 0007: rendering fresh over an unreadable trailer would erase the state, so spp refuses.
  test("a progress comment whose trailer does not decode is left alone: exit 1, the marker named, no write", async () => {
    const r = await runCase("progress", scratchCase(["12", "--pr", "40"], [{ id: 900, body: "<!-- sdd-progress -->\n(rendered)\n<!-- sdd-data: bm90IGpzb24= -->" }]));
    assert.equal(r.code, 1);
    assert.match(r.stderr, /<!-- sdd-progress --> on #12 has an sdd-data trailer that does not decode/);
    assert.deepEqual(r.writes, []);
  });

  test("a progress comment with no trailer is rendered fresh from the fields passed", async () => {
    const r = await runCase("progress", scratchCase(["12", "--worker", "w"], [{ id: 900, body: "<!-- sdd-progress -->\n**Worker:** someone\n" }]));
    assert.equal(r.code, 0, r.stderr);
    assert.deepEqual(readTrailer(body((r.writes as Write[])[0])), { ...PROGRESS, worker: "w", branch: "", ...BY });
  });

  test("spp plan --driver desktop stores the driver, renders its line and keeps the other fields", async () => {
    const plan = { id: 601, body: `<!-- sdd-plan -->\n${trailer({ goal: "G", constraints: "C", branch: "feat/x" })}` };
    const r = await runCase("plan", scratchCase(["197", "--driver", "desktop"], [plan], "197"));
    assert.equal(r.code, 0, r.stderr);
    const b = body((r.writes as Write[])[0]);
    assert.deepEqual(
      (({ driver, goal, constraints, branch }) => ({ driver, goal, constraints, branch }))(readTrailer(b) ?? {}),
      { driver: "desktop", goal: "G", constraints: "C", branch: "feat/x" },
    );
    assert.match(b, /\*\*Driver:\*\* desktop\n/);
  });

  test("spp plan --driver cloud exits 2 naming the unknown driver", async () => {
    const r = await runCase("plan", scratchCase(["197", "--driver", "cloud"], [], "197"));
    assert.equal(r.code, 2);
    assert.match(r.stderr, /unknown driver cloud/);
    assert.match(r.stderr, /usage: spp plan/);
    assert.deepEqual(r.writes, []);
  });

  test("spp plan --goal on a plan comment with no driver renders no Driver line", async () => {
    const plan = { id: 601, body: `<!-- sdd-plan -->\n${trailer({ goal: "G" })}` };
    const r = await runCase("plan", scratchCase(["197", "--goal", "X"], [plan], "197"));
    assert.equal(r.code, 0, r.stderr);
    assert.doesNotMatch(body((r.writes as Write[])[0]), /\*\*Driver:\*\*/);
  });

  test("spp plan --narrowed none empties the narrowing list", async () => {
    const plan = { id: 601, body: `<!-- sdd-plan -->\n${trailer({ goal: "G", narrowed: ["a"] })}` };
    const r = await runCase("plan", scratchCase(["197", "--narrowed", "none"], [plan], "197"));
    assert.equal(r.code, 0, r.stderr);
    assert.deepEqual(readTrailer(body((r.writes as Write[])[0]))?.narrowed, []);
  });

  test("readTrailer: no trailer is an empty object, a malformed one is null, the last one wins", () => {
    assert.deepEqual(readTrailer("<!-- sdd-progress -->\nhi"), {});
    assert.equal(readTrailer("<!-- sdd-progress -->\n<!-- sdd-data: @@ -->"), null);
    assert.equal(readTrailer(`x\n${trailer([1])}`), null);
    assert.deepEqual(readTrailer(`x\r\n${trailer({ a: 1 })}\r\n${trailer({ a: 2 })}  \r\n`), { a: 2 });
  });
});

describe("error paths", () => {
  test("spp progress with no issue exits 2 with usage", async () => {
    const r = await assertCase("progress", scratchCase([]), 2);
    assert.match(r.stderr, /usage: spp progress <issue>/);
  });

  test("a gh failure while reading the comments exits 1 with gh's stderr", async () => {
    const dir = scratchCase(["12", "--worker", "w"]);
    const key = `api repos/{owner}/{repo}/issues/12/comments --paginate --jq ${JQ}`;
    writeFileSync(join(dir, "gh.json"), JSON.stringify({ [key]: { stderr: "HTTP 502: Bad Gateway\n", code: 1 } }));
    const r = await assertCase("progress", dir, 1);
    assert.match(r.stderr, /HTTP 502: Bad Gateway/);
  });
});

describe("integration", () => {
  test("spp status --json reads each ticket's worker from its progress trailer and the Epic branch from the plan trailer", async () => {
    const dir = mkdtempSync(join(tmpdir(), "spp-markers-"));
    writeFileSync(join(dir, "args"), "197\n--json\n");
    const sub = (number: number, comments: string[]) => ({
      number,
      url: `https://github.com/acme/app/issues/${number}`,
      title: `T${number}`,
      state: "OPEN",
      repository: { nameWithOwner: "acme/app" },
      labels: { nodes: [{ name: "ready-for-agent" }, { name: "claimed" }] },
      assignees: { nodes: [] },
      blockedBy: { nodes: [] },
      closedByPullRequestsReferences: { nodes: [] },
      timelineItems: { nodes: [] },
      comments: { nodes: comments.map((b) => ({ body: b, author: { login: "maint" }, authorAssociation: "OWNER" })) },
    });
    const epic = {
      number: 197,
      url: "https://github.com/acme/app/issues/197",
      title: "Epic",
      repository: { nameWithOwner: "acme/app" },
      comments: { nodes: [{ body: "hello" }, { body: `<!-- sdd-plan -->\n## Plan\n${trailer({ goal: "g", branch: "feat/x" })}`, author: { login: "maint" }, authorAssociation: "OWNER" }] },
      subIssues: { nodes: [sub(12, ["first", progress(PROGRESS).body]), sub(13, [])] },
    };
    const key = "api graphql -f query=Snapshot -F owner={owner} -F repo={repo} -F number=197";
    const noFixes = { "api graphql -f query=PullRequests *": { stdout: { data: { repository: { pullRequests: { nodes: [] } } } } } };
    writeFileSync(join(dir, "gh.json"), JSON.stringify({ [key]: { stdout: { data: { repository: { issue: epic } } } }, ...noFixes }));
    const s = (await assertCase("status", dir)).json as EpicState;
    assert.equal(s.tickets.find((t) => t.number === 12)?.worker, "worker-12");
    assert.equal(s.tickets.find((t) => t.number === 13)?.worker, null);
    assert.equal(s.epic.branch, "feat/x");
  });
});
