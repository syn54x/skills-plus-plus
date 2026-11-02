import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { runCase } from "./harness.ts";

// A case directory built at test time: an Epic #197 in acme/app whose Sub-issues, pull requests, comments and
// label events the stub gh answers for. A pull request or events entry left out is a call gh fails.
type Ticket = { n: number; repo?: string; prs?: number[]; events?: string[] | null };
type Setup = {
  tickets: Ticket[];
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
      ["acme/app#197 Epic", "By cause: CLAUDE.md#x 1", "By ticket: #301 1", "Fix rounds: 1", "Hand-backs: 1", "Panel: not found", "Ponytail: not found", ""].join("\n"),
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
