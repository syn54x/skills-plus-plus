import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { delta, readCursor, type Gh, type Incumbent } from "../incumbent-delta.ts";

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, "fixtures", "incumbent-delta");
const NOW = new Date("2026-10-10T00:00:00Z");

const release = (tag: string, date: string) => ({
  tag_name: tag,
  name: tag,
  published_at: date,
  html_url: `https://example.test/${tag}`,
  draft: false,
});
const commit = (sha: string, date: string, message: string) => ({
  sha,
  commit: { committer: { date }, message },
  html_url: `https://example.test/c/${sha}`,
});

// A gh runner that answers each api path from a table and fails on any path it does not know.
function fakeGh(routes: Record<string, unknown>, calls: string[] = []): Gh {
  return (args) => {
    const path = args[1];
    calls.push(path);
    const key = Object.keys(routes).find((k) => path.startsWith(k));
    if (key === undefined) throw new Error(`gh: no route for ${path}`);
    const value = routes[key];
    if (value instanceof Error) throw value;
    return JSON.stringify(value);
  };
}

const alpha: Incumbent = { name: "Alpha", repo: "acme/alpha", releases: true };
const beta: Incumbent = { name: "Beta", repo: "acme/beta", releases: true, changelog: "CHANGELOG.md" };

test("only releases after the cursor come back, and the cursor moves to the newest", () => {
  const gh = fakeGh({
    "repos/acme/alpha/releases": [release("v2", "2026-10-05T12:00:00Z"), release("v1", "2026-09-20T12:00:00Z")],
  });
  const out = delta({ watchlist: [alpha], cursor: { Alpha: "2026-10-01T00:00:00Z" }, now: NOW, gh });
  assert.deepEqual(out.items.map((i) => i.ref), ["v2"]);
  assert.deepEqual(out.items[0], {
    incumbent: "Alpha",
    kind: "release",
    ref: "v2",
    date: "2026-10-05T12:00:00Z",
    title: "v2",
    url: "https://example.test/v2",
  });
  assert.deepEqual(out.cursor, { Alpha: "2026-10-05T12:00:00Z" });
});

test("an item dated exactly at the cursor is not new", () => {
  const gh = fakeGh({ "repos/acme/alpha/releases": [release("v1", "2026-10-01T00:00:00Z")] });
  const out = delta({ watchlist: [alpha], cursor: { Alpha: "2026-10-01T00:00:00Z" }, now: NOW, gh });
  assert.deepEqual(out.items, []);
});

test("changelog commits come back as commit items, with the first message line as the title", () => {
  const calls: string[] = [];
  const gh = fakeGh(
    {
      "repos/acme/beta/releases": [],
      "repos/acme/beta/commits": [
        commit("abcdef1234567", "2026-10-06T00:00:00Z", "docs: note the thing\n\nbody"),
        commit("1111111222222", "2026-09-01T00:00:00Z", "old"),
      ],
    },
    calls,
  );
  const out = delta({ watchlist: [beta], cursor: { Beta: "2026-10-01T00:00:00Z" }, now: NOW, gh });
  assert.deepEqual(out.items.map((i) => [i.kind, i.ref, i.title]), [["commit", "abcdef1", "docs: note the thing"]]);
  assert.ok(calls.some((c) => c.includes("path=CHANGELOG.md") && c.includes("since=2026-10-01T00%3A00%3A00Z")));
});

test("no cursor means the last 90 days only", () => {
  const gh = fakeGh({
    "repos/acme/alpha/releases": [
      release("new", "2026-10-01T00:00:00Z"),
      release("edge", "2026-07-13T00:00:00Z"),
      release("old", "2026-07-01T00:00:00Z"),
    ],
  });
  const out = delta({ watchlist: [alpha], cursor: {}, now: NOW, gh });
  assert.deepEqual(out.items.map((i) => i.ref), ["new", "edge"]);
});

test("an incumbent with nothing new is absent from items and keeps its cursor", () => {
  const gh = fakeGh({
    "repos/acme/alpha/releases": [release("v1", "2026-09-20T00:00:00Z")],
    "repos/acme/beta/releases": [release("b2", "2026-10-08T00:00:00Z")],
    "repos/acme/beta/commits": [],
  });
  const out = delta({
    watchlist: [alpha, beta],
    cursor: { Alpha: "2026-10-01T00:00:00Z", Beta: "2026-10-02T00:00:00Z" },
    now: NOW,
    gh,
  });
  assert.deepEqual([...new Set(out.items.map((i) => i.incumbent))], ["Beta"]);
  assert.deepEqual(out.cursor, { Alpha: "2026-10-01T00:00:00Z", Beta: "2026-10-08T00:00:00Z" });
});

test("a gh failure for one incumbent is reported under errors and the others still return", () => {
  const gh = fakeGh({
    "repos/acme/alpha/releases": new Error("HTTP 502"),
    "repos/acme/beta/releases": [release("b2", "2026-10-08T00:00:00Z")],
    "repos/acme/beta/commits": [],
  });
  const out = delta({
    watchlist: [alpha, beta],
    cursor: { Alpha: "2026-10-01T00:00:00Z" },
    now: NOW,
    gh,
  });
  assert.deepEqual(out.items.map((i) => i.incumbent), ["Beta"]);
  assert.match(out.errors?.Alpha ?? "", /502/);
  assert.equal(out.cursor.Alpha, "2026-10-01T00:00:00Z");
});

test("an incumbent without a repo is skipped without a gh call", () => {
  const calls: string[] = [];
  const out = delta({
    watchlist: [{ name: "Cursor", releases: false }],
    cursor: {},
    now: NOW,
    gh: fakeGh({}, calls),
  });
  assert.deepEqual(out, { items: [], cursor: {} });
  assert.deepEqual(calls, []);
});

test("readCursor reads the trailer's cursor, and nothing when there is no trailer", () => {
  const data = Buffer.from(JSON.stringify({ cursor: { A: "2026-10-01T00:00:00Z" } })).toString("base64");
  assert.deepEqual(readCursor(`body\r\n<!-- sdd-data: ${data} -->\r\n`), { A: "2026-10-01T00:00:00Z" });
  assert.deepEqual(readCursor("just prose"), {});
});

test("readCursor refuses a trailer that does not decode", () => {
  assert.throws(() => readCursor("x\n<!-- sdd-data: !!!notbase64 -->"), /trailer/);
});

function cli(args: string[]) {
  const result = spawnSync(process.execPath, [join(here, "..", "incumbent-delta.ts"), ...args], {
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${join(fixtures, "bin")}:${process.env.PATH}`,
      GH_STUB_DIR: fixtures,
    },
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

test("cli: --issue reads the cursor from the issue trailer and prints items and the next cursor", () => {
  const result = cli(["--issue", "7", "--watchlist", join(fixtures, "watchlist.md"), "--now", "2026-10-10T00:00:00Z"]);
  assert.equal(result.status, 0, result.stderr);
  const out = JSON.parse(result.stdout);
  assert.deepEqual(out.items.map((i: { ref: string }) => i.ref), ["v2.0.0"]);
  assert.deepEqual(out.cursor, { Alpha: "2026-10-05T12:00:00Z" });
});

test("cli: with no --issue the window is the last 90 days", () => {
  const result = cli(["--watchlist", join(fixtures, "watchlist.md"), "--now", "2026-10-10T00:00:00Z"]);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).items.map((i: { ref: string }) => i.ref), ["v2.0.0", "v1.9.0"]);
});
