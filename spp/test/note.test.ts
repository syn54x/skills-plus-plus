import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import type { EpicState } from "../src/derive.ts";
import { runCase } from "./harness.ts";

const here = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT = readFileSync(join(here, "fixtures", "note", "snapshot", "gh.json"), "utf8");
const JQ = ".[] | [.id, .body, .user.login, .author_association] | @json";
const T301 = "https://github.com/acme/app/issues/301";
const ISO = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z$/;

type Write = { cmd: string; argv: string[] };
type Entry = { repo: string; ticket: number; text: string; at: string; milestone: boolean };

// A case directory built at test time: `args`, and gh answers for the Epic snapshot plus `extra`.
function scratchCase(args: string[], extra: Record<string, unknown> = {}): string {
  const dir = mkdtempSync(join(tmpdir(), "spp-note-"));
  writeFileSync(join(dir, "args"), args.join("\n") + "\n");
  writeFileSync(join(dir, "gh.json"), JSON.stringify({ ...JSON.parse(SNAPSHOT), ...extra }));
  return dir;
}

// Runs `fn` with XDG_STATE_HOME pointing at a fresh temp dir (or unset, with HOME there instead).
async function withState<T>(fn: (state: string) => Promise<T>, xdg = true): Promise<T> {
  const state = mkdtempSync(join(tmpdir(), "spp-state-"));
  const saved = { XDG_STATE_HOME: process.env.XDG_STATE_HOME, HOME: process.env.HOME };
  if (xdg) process.env.XDG_STATE_HOME = state;
  else {
    delete process.env.XDG_STATE_HOME;
    process.env.HOME = state;
  }
  try {
    return await fn(state);
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

const note = (args: string[], extra?: Record<string, unknown>) => runCase("note", scratchCase(args, extra));
const logOf = (state: string) =>
  readFileSync(join(state, "spp", "acme__app.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l) as Entry);

describe("happy path", () => {
  test("a plain note appends one line to the repo's log and makes no gh call", async () => {
    await withState(async (state) => {
      const r = await note([T301, "red test for empty cart"]);
      assert.equal(r.code, 0, r.stderr);
      assert.deepEqual(r.writes, []);
      const [entry, ...more] = logOf(state);
      assert.equal(more.length, 0);
      assert.deepEqual({ ...entry, at: "" }, { repo: "acme/app", ticket: 301, text: "red test for empty cart", at: "", milestone: false });
      assert.match(entry.at, ISO);
    });
  });

  test("a milestone note also writes the text into the progress comment's notes through one edit", async () => {
    await withState(async (state) => {
      const stored = Buffer.from(
        JSON.stringify({ status: "in-progress", worker: "worker-301", branch: "sdd/301-x", pr: null, verify: { state: "not-run", sha: "" }, route: null, reason: "", notes: "" }),
      ).toString("base64");
      const comment = JSON.stringify([700, `<!-- sdd-progress -->\n(rendered)\n<!-- sdd-data: ${stored} -->\n`, "maint", "OWNER"]) + "\n";
      const r = await note([T301, "PR open", "--milestone"], {
        [`api repos/acme/app/issues/301/comments --paginate --jq ${JQ}`]: { stdout: comment },
      });
      assert.equal(r.code, 0, r.stderr);
      assert.equal(logOf(state)[0].milestone, true);
      const writes = r.writes as Write[];
      assert.equal(writes.length, 1);
      assert.deepEqual(writes[0].argv.slice(0, 4), ["api", "-X", "PATCH", "repos/acme/app/issues/comments/700"]);
      const body = writes[0].argv.find((a) => a.startsWith("body="))!;
      assert.match(body, /\*\*Worker:\*\* worker-301/);
      assert.match(body, /\nPR open\n/);
      const data = JSON.parse(Buffer.from(/sdd-data: (\S+) -->/.exec(body)![1], "base64").toString());
      assert.equal(data.notes, "PR open");
    });
  });

  test("two notes for a ticket then --list --json gives one entry for it, with the second text", async () => {
    await withState(async () => {
      await note([T301, "first"]);
      await note([T301, "second"]);
      const r = await note(["--list", "197", "--json"]);
      assert.equal(r.code, 0, r.stderr);
      const list = r.json as { ticket: string; text: string; at: string }[];
      assert.equal(list.length, 1);
      assert.deepEqual({ ...list[0], at: "" }, { ticket: T301, text: "second", at: "" });
      assert.match(list[0].at, ISO);
    });
  });
});

describe("integration", () => {
  test("spp status --json shows the latest note per ticket with its timestamp", async () => {
    await withState(async () => {
      await note([T301, "first"]);
      await note([T301, "second"]);
      const at = ((await note(["--list", "197", "--json"])).json as { at: string }[])[0].at;
      const s = (await runCase("status", scratchCase(["197", "--json"]))).json as EpicState;
      assert.deepEqual(s.tickets.find((t) => t.number === 301)!.note, { text: "second", at });
      assert.equal(s.tickets.find((t) => t.number === 302)!.note, null);
    });
  });

  test("the state directory is created on first use and is not inside the repository", async () => {
    await withState(async (state) => {
      assert.equal(existsSync(join(state, ".local")), false);
      const r = await note([T301, "hello"]);
      assert.equal(r.code, 0, r.stderr);
      const file = join(state, ".local", "state", "spp", "acme__app.jsonl");
      assert.ok(existsSync(file), "log not under ~/.local/state/spp");
      assert.ok(!file.startsWith(join(here, "..", "..")), "log is inside the repository");
    }, false);
  });
});

describe("edge cases", () => {
  test("no notes file yet: --list prints an empty list and exits 0", async () => {
    await withState(async () => {
      const json = await note(["--list", "197", "--json"]);
      assert.equal(json.code, 0, json.stderr);
      assert.deepEqual(json.json, []);
      const text = await note(["--list", "197"]);
      assert.equal(text.code, 0, text.stderr);
      assert.equal(text.stdout, "");
    });
  });

  test("a note without text exits 2 with usage", async () => {
    await withState(async () => {
      const r = await note([T301]);
      assert.equal(r.code, 2);
      assert.match(r.stderr, /usage: spp note/);
    });
  });
});
