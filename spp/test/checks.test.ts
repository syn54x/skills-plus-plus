import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { runCase } from "./harness.ts";

type Run = { name: string; bucket: string };

// A case directory built at test time: gh answers `pr checks <pr> --json name,bucket` (or the commit's check runs).
function scratchCase(args: string[], gh: Record<string, unknown>): string {
  const dir = mkdtempSync(join(tmpdir(), "spp-checks-"));
  writeFileSync(join(dir, "args"), args.join("\n") + "\n");
  writeFileSync(join(dir, "gh.json"), JSON.stringify(gh));
  return dir;
}

const PR = "pr checks 40 --json name,bucket";
const prCase = (runs: Run[] | null, extra: { code?: number; stderr?: string } = {}, args = ["40", "--json"]) =>
  scratchCase(args, { [PR]: { ...(runs && { stdout: runs }), ...extra } });

async function checks(dir: string) {
  const r = await runCase("checks", dir);
  assert.equal(r.code, 0, r.stderr);
  assert.deepEqual(r.writes, []);
  return r;
}

describe("happy path", () => {
  test("spp checks 40 with every run in bucket pass is pass", async () => {
    const runs = [{ name: "lint", bucket: "pass" }, { name: "test", bucket: "pass" }];
    assert.deepEqual((await checks(prCase(runs))).json, { result: "pass", runs });
  });
});

describe("edge cases", () => {
  test("one run pending and the others pass is pending, even when gh exits 8", async () => {
    const runs = [{ name: "lint", bucket: "pass" }, { name: "test", bucket: "pending" }];
    assert.deepEqual((await checks(prCase(runs, { code: 8 }))).json, { result: "pending", runs });
  });

  test("no runs (gh exits 1 with no checks reported) is none", async () => {
    const dir = prCase(null, { code: 1, stderr: "no checks reported on the 'sdd/40-x' branch\n" });
    assert.deepEqual((await checks(dir)).json, { result: "none", runs: [] });
  });

  test("skipping runs are not counted and cancel counts as fail", async () => {
    const runs = [{ name: "lint", bucket: "skipping" }, { name: "deploy", bucket: "cancel" }];
    assert.equal(((await checks(prCase(runs))).json as { result: string }).result, "fail");
    const skipped = [{ name: "lint", bucket: "skipping" }];
    assert.equal(((await checks(prCase(skipped))).json as { result: string }).result, "none");
  });

  test("a commit sha reads the commit's check runs and maps them to buckets", async () => {
    const sha = "0123456789abcdef0123456789abcdef01234567";
    const key = `api repos/{owner}/{repo}/commits/${sha}/check-runs --paginate --jq .check_runs[] | [.name, .status, .conclusion] | @json`;
    const lines = [["lint", "completed", "success"], ["docs", "completed", "skipped"], ["test", "in_progress", null], ["e2e", "completed", "timed_out"]];
    const dir = scratchCase([sha, "--json"], { [key]: { stdout: lines.map((l) => JSON.stringify(l) + "\n").join("") } });
    assert.deepEqual((await checks(dir)).json, {
      result: "fail",
      runs: [{ name: "lint", bucket: "pass" }, { name: "docs", bucket: "skipping" }, { name: "test", bucket: "pending" }, { name: "e2e", bucket: "fail" }],
    });
  });
});

describe("error paths", () => {
  test("one run fail is fail, and the text view names the run", async () => {
    const runs = [{ name: "lint", bucket: "fail" }, { name: "test", bucket: "pending" }];
    assert.deepEqual((await checks(prCase(runs, { code: 1 }))).json, { result: "fail", runs });
    assert.equal((await checks(prCase(runs, { code: 1 }, ["40"]))).stdout, "fail: lint\n");
  });

  test("any other gh failure exits 1 with gh's stderr", async () => {
    const r = await runCase("checks", prCase(null, { code: 1, stderr: "HTTP 502: Bad Gateway\n" }));
    assert.equal(r.code, 1);
    assert.match(r.stderr, /HTTP 502/);
  });

  test("no argument exits 2 with usage", async () => {
    const r = await runCase("checks", scratchCase([], {}));
    assert.equal(r.code, 2);
    assert.match(r.stderr, /usage: spp checks/);
  });
});
