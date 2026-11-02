import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { readTrailer } from "../../spp/src/markers.ts";

const here = dirname(fileURLToPath(import.meta.url));
const stubs = join(here, "..", "..", "spp", "test", "stubs");
const HEAD = "c".repeat(40);
const HEAD_READ = "pr view 40 --json headRefOid --jq .headRefOid";
const COMMENTS_READ = "api repos/{owner}/{repo}/issues/40/comments --paginate --jq .[] | [.id, .body] | @json";

// Runs the script against the stub gh, with the pull request's head at `current`.
function record(args: string[], current = HEAD) {
  const dir = mkdtempSync(join(tmpdir(), "spp-record-verdict-"));
  writeFileSync(join(dir, "gh.json"), JSON.stringify({ [HEAD_READ]: { stdout: current + "\n" }, [COMMENTS_READ]: { stdout: "" } }));
  const r = spawnSync(process.execPath, [join(here, "record-verdict.ts"), ...args], {
    encoding: "utf8",
    env: { ...process.env, PATH: `${stubs}${delimiter}${process.env.PATH}`, SPP_CASE: dir, SPP_WRITES: join(dir, "writes.jsonl") },
  });
  const log = join(dir, "writes.jsonl");
  const writes = existsSync(log) ? readFileSync(log, "utf8").trim().split("\n").map((l) => JSON.parse(l).argv as string[]) : [];
  return { code: r.status, stderr: r.stderr, writes };
}

describe("happy path", () => {
  test("a verdict on the pull request's current head is written to its spp-verdict comment", () => {
    const r = record(["40", "219", HEAD.slice(0, 7), "pass", "fail"]);
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.writes.length, 1);
    const body = r.writes[0].find((a) => a.startsWith("body="))!.slice(5);
    assert.deepEqual(readTrailer(body), { ticket: "219", head: HEAD.slice(0, 7), spec: "pass", quality: "fail" });
  });
});

describe("error paths", () => {
  test("a head the pull request has moved past is refused with exit 3 and nothing written", () => {
    const r = record(["40", "219", "a".repeat(40), "pass", "pass"]);
    assert.equal(r.code, 3);
    assert.match(r.stderr, new RegExp(HEAD));
    assert.deepEqual(r.writes, []);
  });

  test("a verdict other than pass or fail is a usage error with nothing written", () => {
    const r = record(["40", "219", HEAD, "PASS", "pass"]);
    assert.equal(r.code, 2);
    assert.deepEqual(r.writes, []);
  });
});
