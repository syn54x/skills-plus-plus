import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { runCase } from "./harness.ts";

const PR = "https://github.com/acme/app/pull/40";
const HEAD = "4".repeat(40);
const JQ = ".[] | [.id, .body, .user.login, .author_association] | @json";

const trailer = (d: unknown) => `<!-- sdd-data: ${Buffer.from(JSON.stringify(d)).toString("base64")} -->`;

type Opts = {
  head?: string; // the head the verdict names
  spec?: string;
  by?: unknown;
  outsider?: boolean;
  args?: string[];
  viewFails?: boolean;
};

// gh reports a merged pull request's merged head as headRefOid too, so a merged case is the same case.
async function gate(o: Opts = {}) {
  const dir = mkdtempSync(join(tmpdir(), "spp-gate-"));
  writeFileSync(join(dir, "args"), (o.args ?? [PR]).join("\n") + "\n");
  const data = { ticket: "30", head: o.head ?? HEAD, spec: o.spec ?? "pass", quality: "pass", ...(o.by !== undefined && { by: o.by }) };
  const comment = [99, `<!-- spp-verdict -->\n${trailer(data)}\n`, o.outsider ? "mallory" : "maint", o.outsider ? "NONE" : "OWNER"];
  const gh = {
    [`pr view ${PR} --json url,headRefOid`]: o.viewFails ? { stderr: "no pull request found", code: 1 } : { stdout: { url: PR, headRefOid: HEAD } },
    [`api repos/acme/app/issues/40/comments --paginate --jq ${JQ}`]: { stdout: JSON.stringify(comment) + "\n" },
    "api graphql -f query=Viewer --jq .data.viewer.login": { stdout: "maint\n" },
  };
  writeFileSync(join(dir, "gh.json"), JSON.stringify(gh));
  return runCase("gate", dir);
}

const VERDICT = { ticket: "30", head: HEAD, spec: "pass", quality: "pass" };

describe("happy path", () => {
  test("a trusted passing verdict on the head prints gate-pass", async () => {
    const r = await gate();
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stdout, `gate-pass ${PR} head 4444444: spec pass, quality pass\n`);
  });

  test("--json carries the verdict and the maker from the trailer", async () => {
    const r = await gate({ args: [PR, "--json"], by: { skill: "review", version: "2.4.0" } });
    assert.equal(r.code, 0, r.stderr);
    assert.deepEqual(r.json, { pr: PR, head: HEAD, state: "gate-pass", verdict: VERDICT, by: { skill: "review", step: null, version: "2.4.0" } });
  });
});

describe("edge cases", () => {
  test("--json on a trailer with no by gives by null", async () => {
    const r = await gate({ args: ["--json", PR] });
    assert.equal(r.code, 0, r.stderr);
    assert.deepEqual(r.json, { pr: PR, head: HEAD, state: "gate-pass", verdict: VERDICT, by: null });
  });

  test("a failing spec prints gate-fail", async () => {
    const r = await gate({ spec: "fail" });
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stdout, `gate-fail ${PR} head 4444444: spec fail, quality pass\n`);
  });

  test("a verdict on an older head prints pr-open", async () => {
    const r = await gate({ head: "3".repeat(40) });
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stdout, `pr-open ${PR} head 4444444: no passing verdict on this head\n`);
  });

  test("a verdict from an outside author is no verdict", async () => {
    const r = await gate({ outsider: true });
    assert.equal(r.stdout, `pr-open ${PR} head 4444444: no passing verdict on this head\n`);
    const j = await gate({ outsider: true, args: [PR, "--json"], by: { skill: "review", version: "2.4.0" } });
    assert.equal(j.code, 0, j.stderr);
    assert.deepEqual(j.json, { pr: PR, head: HEAD, state: "pr-open", verdict: null, by: null });
  });
});

describe("error paths", () => {
  test("a gh failure exits 1 with spp gate: and the message", async () => {
    const r = await gate({ viewFails: true });
    assert.equal(r.code, 1);
    assert.match(r.stderr, /^spp gate: .*no pull request found/);
  });

  test("no argument exits 2 with the usage", async () => {
    const r = await gate({ args: [] });
    assert.equal(r.code, 2);
    assert.match(r.stderr, /usage: spp gate <pr number \| pr URL> \[--json\]/);
  });
});
