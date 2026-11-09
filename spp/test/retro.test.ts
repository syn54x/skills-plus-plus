import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { runCase } from "./harness.ts";

// A case directory built at test time: an Epic #197 in acme/app whose Sub-issues, pull requests, comments and
// label events the stub gh answers for. A pull request or events entry left out is a call gh fails.
type Ticket = { n: number; repo?: string; prs?: number[]; events?: string[] | null };
type Fix = { n: number; body?: string; state?: "OPEN" | "MERGED" };
type Setup = {
  tickets: Ticket[];
  branch?: string; // the integration branch the plan comment records; without it fixes cannot be looked for
  fixes?: Fix[]; // trusted pull requests into the branch that close no Sub-issue (ADR 0011), in acme/app
  reviews?: Record<number, { reviews?: string[]; comments?: string[] }>; // by pull request number (acme/app)
  epicComments?: string[];
  args?: string[];
};

const REPO = "acme/app";
const trailer = (data: unknown) => `<!-- sdd-data: ${Buffer.from(JSON.stringify(data)).toString("base64")} -->`;
const wave = (data: unknown) => `<!-- sdd-wave -->\n(rendered)\n${trailer(data)}\n`;
const pr = (n: number) => ({ number: n, url: `https://github.com/${REPO}/pull/${n}`, state: "OPEN", headRefOid: "abc1234", repository: { nameWithOwner: REPO } });

function build(s: Setup): string {
  const dir = mkdtempSync(join(tmpdir(), "spp-retro-"));
  writeFileSync(join(dir, "args"), (s.args ?? ["197", "--json"]).join("\n") + "\n");
  const answers: Record<string, unknown> = {
    "api graphql -f query=Snapshot -F owner={owner} -F repo={repo} -F number=197": {
      stdout: {
        data: {
          repository: {
            issue: {
              number: 197,
              url: `https://github.com/${REPO}/issues/197`,
              title: "Epic",
              repository: { nameWithOwner: REPO },
              comments: { nodes: s.branch ? [{ body: `<!-- sdd-plan -->\n${trailer({ branch: s.branch })}`, author: { login: "maint" }, authorAssociation: "OWNER" }] : [] },
              subIssues: {
                nodes: s.tickets.map((t) => ({
                  number: t.n,
                  url: `https://github.com/${t.repo ?? REPO}/issues/${t.n}`,
                  title: `Ticket ${t.n}`,
                  state: "CLOSED",
                  repository: { nameWithOwner: t.repo ?? REPO },
                  labels: { nodes: [{ name: "size:M" }] },
                  assignees: { nodes: [] },
                  blockedBy: { nodes: [] },
                  closedByPullRequestsReferences: { nodes: (t.prs ?? []).map(pr) },
                  timelineItems: { nodes: [] },
                })),
              },
            },
          },
        },
      },
    },
    "api repos/{owner}/{repo}/issues/197/comments --paginate --jq .[] | [.id, .body, .user.login, .author_association] | @json": {
      stdout: (s.epicComments ?? []).map((b, i) => JSON.stringify([i + 1, b, "maint", "OWNER"]) + "\n").join(""),
    },
  };
  for (const t of s.tickets) {
    if (t.events === null) continue;
    answers[`api repos/${t.repo ?? REPO}/issues/${t.n}/events --paginate --jq .[] | select(.event == "labeled") | .label.name`] = { stdout: (t.events ?? []).map((e) => e + "\n").join("") };
  }
  if (s.branch) {
    for (const repo of new Set([REPO, ...s.tickets.map((t) => t.repo ?? REPO)])) {
      const [owner, name] = repo.split("/");
      const nodes = repo === REPO ? (s.fixes ?? []).map((f) => ({ ...pr(f.n), state: f.state ?? "MERGED", baseRefName: s.branch, body: f.body ?? "", author: { login: "maint" }, authorAssociation: "OWNER", comments: { nodes: [] } })) : [];
      answers[`api graphql -f query=PullRequests -f owner=${owner} -f repo=${name} -f branch=${s.branch}`] = { stdout: { data: { viewer: { login: "maint" }, repository: { pullRequests: { nodes } } } } };
    }
  }
  for (const [n, v] of Object.entries(s.reviews ?? {})) {
    answers[`pr view https://github.com/${REPO}/pull/${n} --json reviews,comments`] = {
      stdout: { reviews: (v.reviews ?? []).map((body) => ({ body })), comments: (v.comments ?? []).map((body) => ({ body })) },
    };
  }
  writeFileSync(join(dir, "gh.json"), JSON.stringify(answers));
  return dir;
}

const LOC = "src/a.ts:3 at abc1234";
const verdict = (head: string, ...findings: string[]) => [head, ...findings].join("\n");
const spec = (...f: string[]) => verdict("## Spec: FAIL", ...f);
const quality = (...f: string[]) => verdict("## Quality: FAIL", ...f);

type Retro = {
  byCause: Record<string, number>;
  byTicket: Record<string, number>;
  rounds: number;
  fixPrRounds: number | "not found";
  handBacks: number;
  panel: { rounds: number; findings: number } | "not found";
  ponytail: { hits: number; unique: number; overlap: number } | "not found";
};

async function retro(s: Setup) {
  const r = await runCase("retro", build(s));
  assert.equal(r.code, 0, r.stderr);
  return { out: r.json as Retro, stderr: r.stderr, stdout: r.stdout };
}

describe("happy path", () => {
  test("two verdicts tagged [CLAUDE.md#no-em-dash] count 2 under that whole tag", async () => {
    const { out } = await retro({
      tickets: [{ n: 301, prs: [501] }],
      reviews: {
        501: {
          reviews: [spec(`- Important · [CLAUDE.md#no-em-dash] · ${LOC} · Extra · a dash`), quality(`- Minor · [CLAUDE.md#no-em-dash] · ${LOC} · another dash`)],
        },
      },
    });
    assert.equal(out.byCause["CLAUDE.md#no-em-dash"], 2);
    assert.equal(out.rounds, 2);
    assert.deepEqual(out.byTicket, { "#301": 2 });
  });

  test("findings are counted by their whole tag, an untagged finding is none, and ADDRESSED rows never count", async () => {
    const { out } = await retro({
      tickets: [{ n: 301, prs: [501] }],
      reviews: {
        501: {
          reviews: [
            spec(`- Critical · [ticket#Interfaces] · ${LOC} · Missing`, `- Important · [epic#Failure law] · ${LOC} · Misunderstood`, `- Minor · [none] · ${LOC} · odd`),
            quality(`- Important · [epic#Other] · ${LOC} · x`, `- Minor · ${LOC} · no tag at all`),
            verdict("## Spec: PASS", "| F1 | ADDRESSED | src/a.ts:3 |"),
          ],
        },
      },
    });
    assert.deepEqual(out.byCause, { "ticket#Interfaces": 1, "epic#Failure law": 1, none: 2, "epic#Other": 1 });
    assert.equal(out.rounds, 2); // the PASS review is no round
  });

  test("counts by ticket across tickets, comments as well as reviews", async () => {
    const { out } = await retro({
      tickets: [{ n: 301, prs: [501] }, { n: 302, prs: [502] }],
      reviews: {
        501: { comments: [spec(`- Important · [none] · ${LOC} · x`, `- Minor · [none] · ${LOC} · y`)] },
        502: { reviews: [verdict("## Spec: PASS"), verdict("## Quality: PASS")] },
      },
    });
    assert.deepEqual(out.byTicket, { "#301": 2, "#302": 0 });
    assert.equal(out.rounds, 1);
  });

  test("hand-backs count the needs-info, ready-for-human and blocked labelings across tickets", async () => {
    const { out } = await retro({
      tickets: [{ n: 301, events: ["claimed", "needs-info", "claimed", "blocked"] }, { n: 302, events: ["ready-for-human", "size:M"] }],
    });
    assert.equal(out.handBacks, 3);
  });

  test("the panel is the rounds recorded in the wave trailer, with their findings summed", async () => {
    const { out } = await retro({
      tickets: [{ n: 301 }],
      epicComments: [
        wave({
          waves: [],
          panel: [
            { round: 1, verdict: "FIX FIRST", report: "https://x/1", severity: { critical: 1, important: 2, minor: 3 }, persona: {}, dropped: 4 },
            { round: 2, verdict: "MERGE", report: null, severity: { critical: 0, important: 0, minor: 1 }, persona: {}, dropped: 0 },
          ],
        }),
      ],
    });
    assert.deepEqual(out.panel, { rounds: 2, findings: 7 });
  });

  test("ponytail hits, unique hits and overlap come from its comments against the gate's findings on the same pull request", async () => {
    const { out } = await retro({
      tickets: [{ n: 301, prs: [501] }, { n: 302, prs: [502] }],
      reviews: {
        501: {
          reviews: [spec(`- Important · [none] · src/a.ts:10 at abc1234 · Missing`)],
          comments: ["## Ponytail\n- Important · src/a.ts:12 · same defect, other words\n- Minor · src/a.ts:90 · unique one\n- Minor · src/b.ts:10 · unique two"],
        },
        502: { comments: ["## Ponytail\n- Minor · src/z.ts:1 · alone"] },
      },
    });
    assert.deepEqual(out.ponytail, { hits: 4, unique: 3, overlap: 1 });
  });

  test("a pull request only the wave trailer records is counted for its ticket", async () => {
    const { out } = await retro({
      tickets: [{ n: 301 }, { n: 302, repo: "acme/api" }],
      epicComments: [wave({ waves: [{ n: 1, tickets: ["301", "acme/api#302"], workers: [], started: "", edges: [], prs: { "301": "#601", "acme/api#302": `https://github.com/${REPO}/pull/602` } }], panel: [] })],
      reviews: { 601: { reviews: [spec(`- Minor · [none] · ${LOC} · x`)] }, 602: { reviews: [quality(`- Minor · [none] · ${LOC} · y`)] } },
    });
    assert.deepEqual(out.byTicket, { "#301": 1, "acme/api#302": 1 });
  });

  test("the text view prints the numbers and reads not found for what is missing", async () => {
    const r = await runCase(
      "retro",
      build({ tickets: [{ n: 301, prs: [501], events: ["needs-info"] }], reviews: { 501: { reviews: [spec(`- Minor · [CLAUDE.md#x] · ${LOC} · y`)] } }, args: ["197"] }),
    );
    assert.equal(r.code, 0, r.stderr);
    assert.equal(
      r.stdout,
      ["acme/app#197 Epic", "By cause: CLAUDE.md#x 1", "By ticket: #301 1", "Fix rounds: 1", "Fix pull request rounds: not found", "Hand-backs: 1", "Panel: not found", "Ponytail: not found", ""].join("\n"),
    );
  });
});

describe("edge cases", () => {
  test("no panel comment is panel: not found, never 0", async () => {
    const { out } = await retro({ tickets: [{ n: 301, prs: [501] }], reviews: { 501: {} } });
    assert.equal(out.panel, "not found");
  });

  test("a wave comment with no panel rounds is panel: not found", async () => {
    const { out } = await retro({ tickets: [{ n: 301 }], epicComments: [wave({ waves: [], panel: [] })] });
    assert.equal(out.panel, "not found");
  });

  test("no ponytail findings is ponytail: not found, and an empty ponytail comment is a real zero", async () => {
    const none = await retro({ tickets: [{ n: 301, prs: [501] }], reviews: { 501: { reviews: [spec(`- Minor · [none] · ${LOC} · x`)] } } });
    assert.equal(none.out.ponytail, "not found");
    const zero = await retro({ tickets: [{ n: 301, prs: [501] }], reviews: { 501: { comments: ["## Ponytail\nNothing to add."] } } });
    assert.deepEqual(zero.out.ponytail, { hits: 0, unique: 0, overlap: 0 });
  });

  test("a ticket with no pull request is left out of byTicket and named as not found on stderr", async () => {
    const { out, stderr } = await retro({ tickets: [{ n: 301, prs: [501] }, { n: 302 }], reviews: { 501: { reviews: [spec(`- Minor · [none] · ${LOC} · x`)] } } });
    assert.deepEqual(out.byTicket, { "#301": 1 });
    assert.match(stderr, /not found: pull request for #302/);
  });

  test("a pull request gh cannot read and events gh cannot read are named as not found, not counted as 0", async () => {
    const { out, stderr } = await retro({ tickets: [{ n: 301, prs: [501], events: null }], reviews: {} });
    assert.deepEqual(out.byTicket, {});
    assert.match(stderr, /not found: reviews on https:\/\/github\.com\/acme\/app\/pull\/501/);
    assert.match(stderr, /not found: events on #301/);
  });

  test("an unreadable wave trailer is panel: not found and is named on stderr", async () => {
    const { out, stderr } = await retro({ tickets: [{ n: 301 }], epicComments: ["<!-- sdd-wave -->\nWave 1\n<!-- sdd-data: !!!! -->\n"] });
    assert.equal(out.panel, "not found");
    assert.match(stderr, /not found: wave trailer is unreadable/);
  });

  test("an Epic with no Sub-issues is named as not found", async () => {
    const { out, stderr } = await retro({ tickets: [] });
    assert.deepEqual(out.byTicket, {});
    assert.match(stderr, /not found: sub-issues/);
  });
});

describe("error paths", () => {
  test("no Epic exits 2 with usage", async () => {
    const r = await runCase("retro", build({ tickets: [], args: [] }));
    assert.equal(r.code, 2);
    assert.match(r.stderr, /usage: spp retro/);
  });

  test("an Epic number that does not exist exits 1 with epic not found", async () => {
    const dir = build({ tickets: [] });
    const key = "api graphql -f query=Snapshot -F owner={owner} -F repo={repo} -F number=197";
    writeFileSync(join(dir, "gh.json"), JSON.stringify({ [key]: { stdout: { data: { repository: { issue: null } } }, stderr: "not found", code: 1 } }));
    const r = await runCase("retro", dir);
    assert.equal(r.code, 1);
    assert.match(r.stderr, /epic not found/);
  });
});

// #383: a panel round is one per pull request and round, so a Multi-repo epic's repos each count their own.
describe("panel rounds per pull request", () => {
  const A = "https://github.com/acme/api/pull/40";
  const B = "https://github.com/acme/web/pull/30";
  const round = (n: number, important: number, pr?: string) => ({ round: n, verdict: "FIX FIRST", report: null, severity: { critical: 0, important, minor: 0 }, persona: {}, dropped: 0, ...(pr && { pr }) });
  const panelOf = async (panel: unknown[]) => (await retro({ tickets: [{ n: 301 }], epicComments: [wave({ waves: [], panel })] })).out.panel;

  test("rounds 1 and 2 for one pull request and round 1 for another are 3 rounds and the sum of all their findings", async () => {
    assert.deepEqual(await panelOf([round(1, 12, A), round(2, 5, A), round(1, 4, B)]), { rounds: 3, findings: 21 });
  });

  test("a round 1 with no pr and a round 1 for a pull request are 2 rounds", async () => {
    assert.deepEqual(await panelOf([round(1, 3), round(1, 4, A)]), { rounds: 2, findings: 7 });
  });
});

// #383: a Fix pull request refs a Sub-issue and closes none, so it is found through derive's fixes (ADR 0011).
describe("Fix pull requests", () => {
  const BRANCH = "feat/epic";
  const gate = spec(`- Important · [CLAUDE.md#a] · ${LOC} · one`, `- Minor · [epic#b] · ${LOC} · two`);
  // Sub-issue #301 with its own pull request #501, which failed one gate on one finding.
  const slice = { tickets: [{ n: 301, prs: [501] }], branch: BRANCH, reviews: { 501: { reviews: [spec(`- Minor · [CLAUDE.md#a] · ${LOC} · own`)] } } };

  test("a merged Fix pull request refing #301 with one failing verdict of two findings is one fix round, its findings counted under #301 and by tag", async () => {
    const { out, stderr } = await retro({ ...slice, fixes: [{ n: 601, body: "Refs #301\n\nFix round" }], reviews: { ...slice.reviews, 601: { reviews: [gate] } } });
    assert.equal(out.fixPrRounds, 1);
    assert.equal(out.rounds, 1); // the slice pull request's, unchanged
    assert.deepEqual(out.byTicket, { "#301": 3 });
    assert.deepEqual(out.byCause, { "CLAUDE.md#a": 2, "epic#b": 1 });
    assert.equal(stderr, "");
  });

  test("an open Fix pull request counts too, and a passing verdict is no round", async () => {
    const { out } = await retro({ ...slice, fixes: [{ n: 601, body: "Refs #301", state: "OPEN" }], reviews: { ...slice.reviews, 601: { reviews: [verdict("## Spec: PASS")] } } });
    assert.equal(out.fixPrRounds, 0);
    assert.deepEqual(out.byTicket, { "#301": 1 });
  });

  test("a Fix pull request with no Refs line and one failing verdict is a fix round in byCause only, with no byTicket entry", async () => {
    const { out } = await retro({ ...slice, fixes: [{ n: 601, body: "Lint only" }], reviews: { ...slice.reviews, 601: { reviews: [gate] } } });
    assert.equal(out.fixPrRounds, 1);
    assert.deepEqual(out.byCause, { "CLAUDE.md#a": 2, "epic#b": 1 });
    assert.deepEqual(out.byTicket, { "#301": 1 });
  });

  test("a Fix pull request the wave trailer also records for #301 counts once, as that Sub-issue's pull request", async () => {
    const { out } = await retro({
      ...slice,
      fixes: [{ n: 601, body: "Refs #301" }],
      epicComments: [wave({ waves: [{ n: 1, tickets: ["301"], workers: [], started: "", edges: [], prs: { "301": "#601" } }], panel: [] })],
      reviews: { ...slice.reviews, 601: { reviews: [gate] } },
    });
    assert.equal(out.fixPrRounds, 0);
    assert.equal(out.rounds, 2);
    assert.deepEqual(out.byTicket, { "#301": 3 });
    assert.deepEqual(out.byCause, { "CLAUDE.md#a": 2, "epic#b": 1 });
  });

  test("a Fix pull request refing a Sub-issue in another repo is counted under owner/repo#N", async () => {
    const { out } = await retro({ tickets: [{ n: 301 }, { n: 302, repo: "acme/api", prs: [] }], branch: BRANCH, fixes: [{ n: 601, body: "Refs acme/api#302" }], reviews: { 601: { reviews: [gate] } } });
    assert.equal(out.fixPrRounds, 1);
    assert.equal(out.byTicket["acme/api#302"], 2);
  });

  test("with no fixes on a plan that records the branch, fixPrRounds is 0 and nothing is named on stderr", async () => {
    const { out, stderr } = await retro({ ...slice });
    assert.equal(out.fixPrRounds, 0);
    assert.equal(stderr, "");
  });

  test("with no plan comment fixPrRounds is not found and stderr names the integration branch", async () => {
    const { out, stderr } = await retro({ tickets: [{ n: 301, prs: [501] }], reviews: { 501: { reviews: [spec(`- Minor · [none] · ${LOC} · x`)] } } });
    assert.equal(out.fixPrRounds, "not found");
    assert.match(stderr, /^spp retro: not found: integration branch$/m);
  });

  test("a Fix pull request gh cannot read is named reviews on its URL, and fixPrRounds counts the fixes that were read", async () => {
    const { out, stderr } = await retro({ ...slice, fixes: [{ n: 601, body: "Refs #301" }, { n: 602, body: "Refs #301" }], reviews: { ...slice.reviews, 601: { reviews: [gate] } } });
    assert.equal(out.fixPrRounds, 1);
    assert.match(stderr, /not found: reviews on https:\/\/github\.com\/acme\/app\/pull\/602\b/);
    assert.deepEqual(out.byTicket, { "#301": 3 });
  });

  test("the text view prints Fix pull request rounds on the line after Fix rounds", async () => {
    const r = await runCase("retro", build({ ...slice, fixes: [{ n: 601, body: "Refs #301" }], reviews: { ...slice.reviews, 601: { reviews: [gate] } }, args: ["197"] }));
    assert.equal(r.code, 0, r.stderr);
    assert.match(r.stdout, /\nFix rounds: 1\nFix pull request rounds: 1\nHand-backs: /);
  });
});
