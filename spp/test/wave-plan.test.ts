import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { runCase } from "./harness.ts";

type Spec = { n: number; repo?: string; labels?: string[]; create?: string[]; modify?: string[]; test?: string[]; consumes?: string; produces?: string };
type Plan = { wave: string[]; held: { ticket: string; reason: string; running?: true }[] };

const READY = ["ready-for-agent", "size:S"];
const url = (t: Spec) => `https://github.com/${t.repo ?? "acme/app"}/issues/${t.n}`;
const list = (kind: string, paths: string[] | undefined) => (paths?.length ? [`- ${kind}: ${paths.map((p) => `\`${p}\``).join(", ")}`] : []);

const body = (t: Spec) =>
  [
    "## Files owned",
    "",
    ...list("Create", t.create),
    ...list("Modify", t.modify),
    ...list("Test", t.test),
    "",
    "## Interfaces",
    "",
    `- Consumes: ${t.consumes ?? "none"}`,
    `- Produces: ${t.produces ?? "none"}`,
  ].join("\n");

// A case directory for Epic 197 (acme/app) whose Sub-issues are `tickets`, in the order given.
function scratch(tickets: Spec[], ...args: string[]): string {
  const dir = mkdtempSync(join(tmpdir(), "spp-wave-"));
  const node = (t: Spec) => ({
    number: t.n,
    url: url(t),
    title: `Ticket ${t.n}`,
    state: "OPEN",
    repository: { nameWithOwner: t.repo ?? "acme/app" },
    labels: { nodes: (t.labels ?? READY).map((name) => ({ name })) },
    assignees: { nodes: [] },
    blockedBy: { nodes: [] },
    closedByPullRequestsReferences: { nodes: [] },
    timelineItems: { nodes: [] },
  });
  const answers: Record<string, unknown> = {
    "api graphql -f query=Snapshot -F owner={owner} -F repo={repo} -F number=197": {
      stdout: { data: { repository: { issue: { number: 197, url: "https://github.com/acme/app/issues/197", title: "Epic", repository: { nameWithOwner: "acme/app" }, subIssues: { nodes: tickets.map(node) } } } } },
    },
  };
  for (const t of tickets) answers[`issue view ${url(t)} --json body`] = { stdout: { body: body(t) } };
  writeFileSync(join(dir, "gh.json"), JSON.stringify(answers));
  writeFileSync(join(dir, "args"), ["plan", "197", ...args].join("\n") + "\n");
  return dir;
}

async function plan(tickets: Spec[], ...args: string[]): Promise<Plan> {
  const r = await runCase("wave", scratch(tickets, "--json", ...args));
  assert.equal(r.code, 0, r.stderr);
  assert.deepEqual(r.writes, []); // planning a wave only reads
  return r.json as Plan;
}

describe("happy path", () => {
  test("spp wave plan 197 with A and B ready and disjoint puts both in wave", async () => {
    const p = await plan([{ n: 301, modify: ["src/a.ts"], test: ["test/a.test.ts"] }, { n: 302, modify: ["src/b.ts"], test: ["test/b.test.ts"] }]);
    assert.deepEqual(p, { wave: ["301", "302"], held: [] });
  });

  test("the text view lists the wave and each held ticket with its reason", async () => {
    const dir = scratch([{ n: 301, modify: ["src/a.ts"] }, { n: 302, modify: ["src/a.ts"] }]);
    writeFileSync(join(dir, "args"), "plan\n197\n");
    const r = await runCase("wave", dir);
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stdout, "wave: 301\nheld: 302 (shares src/a.ts with 301)\n");
  });
});

describe("edge cases", () => {
  test("--running 301: 301 is held, marked running, and 302 sharing its file is held", async () => {
    const p = await plan([{ n: 301, modify: ["src/a.ts"] }, { n: 302, modify: ["src/a.ts"] }, { n: 303, modify: ["src/c.ts"] }], "--running", "301");
    assert.deepEqual(p, {
      wave: ["303"],
      held: [
        { ticket: "301", reason: "running, its worker has not reported back", running: true },
        { ticket: "302", reason: "shares src/a.ts with 301" },
      ],
    });
  });

  test("--running 301 holds it once it has claimed, not only while it is ready", async () => {
    const p = await plan([{ n: 301, labels: [...READY, "claimed"], modify: ["src/a.ts"] }, { n: 302, modify: ["src/b.ts"] }], "--running", "301");
    assert.deepEqual(p, { wave: ["302"], held: [{ ticket: "301", reason: "running, its worker has not reported back", running: true }] });
  });

  test("--running with no value is a usage error, the same one spp next gives", async () => {
    const r = await runCase("wave", scratch([{ n: 301, modify: ["src/a.ts"] }], "--running"));
    assert.equal(r.code, 2);
    assert.match(r.stderr, /--running takes 101,owner\/repo#7/);
  });

  test("A and B both Modify the same file: only A in wave, B held with 'shares <path> with A'", async () => {
    const p = await plan([{ n: 301, modify: ["src/a.ts"] }, { n: 302, modify: ["src/a.ts"] }]);
    assert.deepEqual(p, { wave: ["301"], held: [{ ticket: "302", reason: "shares src/a.ts with 301" }] });
  });

  test("a shared Test path conflicts too", async () => {
    const p = await plan([{ n: 301, test: ["test/x.test.ts"] }, { n: 302, test: ["test/x.test.ts"] }]);
    assert.deepEqual(p.held, [{ ticket: "302", reason: "shares test/x.test.ts with 301" }]);
  });

  test("a directory glob covering the other ticket's path conflicts, in either direction", async () => {
    const globFirst = await plan([{ n: 301, modify: ["spp/src/**"] }, { n: 302, modify: ["spp/src/a.ts"] }]);
    assert.deepEqual(globFirst, { wave: ["301"], held: [{ ticket: "302", reason: "shares spp/src/a.ts with 301" }] });
    const pathFirst = await plan([{ n: 301, modify: ["spp/src/a.ts"] }, { n: 302, test: ["spp/src/*"] }]);
    assert.deepEqual(pathFirst.held, [{ ticket: "302", reason: "shares spp/src/* with 301" }]);
  });

  test("a glob that does not reach the other path does not conflict", async () => {
    const p = await plan([{ n: 301, modify: ["spp/src/**"] }, { n: 302, modify: ["spp/test/a.ts"] }, { n: 303, modify: ["docs/*.md"] }]);
    assert.deepEqual(p, { wave: ["301", "302", "303"], held: [] });
  });

  test("Create against Modify of the same path conflicts", async () => {
    const p = await plan([{ n: 301, create: ["src/new.ts"] }, { n: 302, modify: ["src/new.ts"] }]);
    assert.deepEqual(p.held, [{ ticket: "302", reason: "shares src/new.ts with 301" }]);
  });

  test("the same path in two repos is not a conflict", async () => {
    const p = await plan([{ n: 301, modify: ["src/a.ts"] }, { n: 7, repo: "acme/api", modify: ["src/a.ts"] }]);
    assert.deepEqual(p, { wave: ["acme/api#7", "301"], held: [] });
  });

  test("B Consumes what A Produces with no edge: B held with 'consumes A'", async () => {
    const p = await plan([
      { n: 301, modify: ["src/a.ts"], produces: "`parseThing(text: string): Thing`, used by #302" },
      { n: 302, modify: ["src/b.ts"], consumes: "`parseThing` from #301" },
    ]);
    assert.deepEqual(p, { wave: ["301"], held: [{ ticket: "302", reason: "consumes 301" }] });
  });

  test("a Consumes that names the ticket but not the symbol still holds the consumer", async () => {
    const p = await plan([{ n: 301, modify: ["src/a.ts"], produces: "`x()`" }, { n: 302, modify: ["src/b.ts"], consumes: "the route from #301" }]);
    assert.deepEqual(p.held, [{ ticket: "302", reason: "consumes 301" }]);
  });

  test("the lower number is kept when the lower-numbered ticket is the consumer", async () => {
    const p = await plan([
      { n: 301, modify: ["src/a.ts"], consumes: "`makeThing`" },
      { n: 302, modify: ["src/b.ts"], produces: "`makeThing(): Thing`" },
    ]);
    assert.deepEqual(p, { wave: ["301"], held: [{ ticket: "302", reason: "consumed by 301" }] });
  });

  test("four ready tickets with --max 2: two in wave, two held 'wave full'", async () => {
    const four = [301, 302, 303, 304].map((n) => ({ n, modify: [`src/${n}.ts`] }));
    const p = await plan(four, "--max", "2");
    assert.deepEqual(p, {
      wave: ["301", "302"],
      held: [{ ticket: "303", reason: "wave full" }, { ticket: "304", reason: "wave full" }],
    });
  });

  test("the default --max is 4", async () => {
    const p = await plan([301, 302, 303, 304, 305].map((n) => ({ n, modify: [`src/${n}.ts`] })));
    assert.equal(p.wave.length, 4);
    assert.deepEqual(p.held, [{ ticket: "305", reason: "wave full" }]);
  });

  test("tickets are considered by number, whatever order the Epic lists them", async () => {
    const p = await plan([{ n: 303, modify: ["src/a.ts"] }, { n: 301, modify: ["src/a.ts"] }]);
    assert.deepEqual(p, { wave: ["301"], held: [{ ticket: "303", reason: "shares src/a.ts with 301" }] });
  });

  test("a ticket that conflicts with a held one still runs", async () => {
    const p = await plan([{ n: 301, modify: ["src/a.ts"] }, { n: 302, modify: ["src/a.ts", "src/b.ts"] }, { n: 303, modify: ["src/b.ts"] }]);
    assert.deepEqual(p, { wave: ["301", "303"], held: [{ ticket: "302", reason: "shares src/a.ts with 301" }] });
  });

  test("tickets that are not ready (claimed, no ready-for-agent) are neither planned nor held", async () => {
    const p = await plan([
      { n: 301, modify: ["src/a.ts"] },
      { n: 302, modify: ["src/b.ts"], labels: ["ready-for-agent", "claimed"] },
      { n: 303, modify: ["src/a.ts"], labels: ["size:S"] },
    ]);
    assert.deepEqual(p, { wave: ["301"], held: [] });
  });

  // F3 on #267: in-flight work seeds the check, so a ready ticket overlapping it stays held until it merges.
  test("a claimed ticket in flight holds a ready one that shares its path or consumes what it produces", async () => {
    const p = await plan([
      { n: 301, modify: ["src/a.ts"] },
      { n: 302, modify: ["src/b.ts"], consumes: "`makeThing`" },
      { n: 303, modify: ["src/c.ts"] },
      { n: 310, modify: ["src/a.ts"], produces: "`makeThing(): Thing`", labels: ["ready-for-agent", "claimed"] },
    ]);
    assert.deepEqual(p, {
      wave: ["303"],
      held: [
        { ticket: "301", reason: "shares src/a.ts with 310" },
        { ticket: "302", reason: "consumes 310" },
      ],
    });
  });

  test("an Epic with nothing ready plans an empty wave", async () => {
    assert.deepEqual(await plan([{ n: 301, labels: ["claimed"] }]), { wave: [], held: [] });
  });
});

describe("error path", () => {
  test("a --max that is not a positive integer exits 2 with usage", async () => {
    const r = await runCase("wave", scratch([{ n: 301 }], "--max", "0"));
    assert.equal(r.code, 2);
    assert.match(r.stderr, /spp wave plan <epic>/);
  });

  // F9 on #267: wave plan reads the snapshot through fetchSnapshot, which names a missing Epic like status does.
  test("an Epic that does not exist exits 1 with epic not found", async () => {
    const dir = scratch([]);
    const missing = { stdout: { data: { repository: { issue: null } } }, stderr: "GraphQL: Could not resolve to an Issue with the number of 197.", code: 1 };
    writeFileSync(join(dir, "gh.json"), JSON.stringify({ "api graphql -f query=Snapshot -F owner={owner} -F repo={repo} -F number=197": missing }));
    const r = await runCase("wave", dir);
    assert.equal(r.code, 1);
    assert.match(r.stderr, /^spp wave: epic not found$/m);
  });

  test("a ready ticket without a Files owned section is held, not planned", async () => {
    const dir = scratch([{ n: 301, modify: ["src/a.ts"] }, { n: 302, modify: ["src/b.ts"] }]);
    const gh = JSON.parse(readFileSync(join(dir, "gh.json"), "utf8"));
    gh[`issue view ${url({ n: 301 })} --json body`] = { stdout: { body: "## What to build\n\nx" } };
    writeFileSync(join(dir, "gh.json"), JSON.stringify(gh));
    writeFileSync(join(dir, "args"), "plan\n197\n--json\n");
    const r = await runCase("wave", dir);
    assert.equal(r.code, 0, r.stderr);
    assert.deepEqual(r.json, { wave: ["302"], held: [{ ticket: "301", reason: "no Files owned" }] });
  });
});
