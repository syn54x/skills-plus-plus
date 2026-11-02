import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

// The release pull request is opened with GITHUB_TOKEN, which starts no pull_request run, so release.yml dispatches the evals.
// shortcut: line-level text checks instead of a YAML parse, since the repo carries no YAML parser; parse if these files grow.
const workflows = join(dirname(fileURLToPath(import.meta.url)), "..", "..", ".github", "workflows");
const release = readFileSync(join(workflows, "release.yml"), "utf8");
const evals = readFileSync(join(workflows, "evals.yml"), "utf8");

describe("release.yml starts the evals on the release pull request", () => {
  test("a step after the changesets action dispatches evals.yml on the release branch", () => {
    const action = release.indexOf("uses: changesets/action@");
    const dispatch = release.indexOf("gh workflow run evals.yml --ref changeset-release/main");
    assert.ok(action > -1, "changesets/action step");
    assert.ok(dispatch > action, "dispatch runs after the changesets action");
  });

  test("the dispatch runs only when the action opened or updated the release pull request", () => {
    assert.match(release, /uses: changesets\/action@v\d+\n\s+id: changesets\n/);
    assert.match(release, /if: steps\.changesets\.outputs\.pullRequestNumber != ''/);
  });

  test("the job may dispatch workflows", () => {
    assert.match(release, /permissions:\n(?:\s+[\w-]+: \w+\n)*\s+actions: write\n/);
  });
});

describe("evals.yml triggers", () => {
  test("it runs on manual dispatch", () => {
    assert.match(evals, /^on:\n(?:\s+.*\n)*?\s+workflow_dispatch:/m);
  });

  test("a normal pull request or push starts no eval run", () => {
    const on = evals.slice(evals.indexOf("\non:"), evals.indexOf("\npermissions:"));
    assert.doesNotMatch(on, /pull_request|push/);
  });
});

describe("evals.yml credential", () => {
  // The credential check's shell, cut from the step's `run: |` block and run as CI would.
  const step = evals.slice(evals.indexOf("name: check the model credential"));
  const script = step.slice(step.indexOf("run: |") + "run: |".length, step.indexOf("\n      - if:")).replace(/^ {10}/gm, "");
  const present = (env: Record<string, string>) => {
    const out = join(mkdtempSync(join(tmpdir(), "spp-evals-")), "output");
    const r = spawnSync("sh", ["-c", script], { encoding: "utf8", env: { PATH: process.env.PATH, GITHUB_OUTPUT: out, ...env } });
    assert.equal(r.status, 0, r.stderr);
    return readFileSync(out, "utf8").trim();
  };

  test("the job passes both secrets to Claude Code", () => {
    assert.match(evals, /ANTHROPIC_API_KEY: \$\{\{ secrets\.ANTHROPIC_API_KEY \}\}/);
    assert.match(evals, /CLAUDE_CODE_OAUTH_TOKEN: \$\{\{ secrets\.CLAUDE_CODE_OAUTH_TOKEN \}\}/);
  });

  test("either credential is enough to run, and neither skips", () => {
    assert.equal(present({ ANTHROPIC_API_KEY: "k", CLAUDE_CODE_OAUTH_TOKEN: "" }), "present=true");
    assert.equal(present({ ANTHROPIC_API_KEY: "", CLAUDE_CODE_OAUTH_TOKEN: "t" }), "present=true");
    assert.equal(present({ ANTHROPIC_API_KEY: "", CLAUDE_CODE_OAUTH_TOKEN: "" }), "present=false");
  });
});

describe("release.yml tags and releases a published version", () => {
  // The step's shell, cut from its `run: |` block and run with stub git, npm and gh on the PATH.
  const step = release.slice(release.indexOf("name: tag and release the published version"));
  const script = step.slice(step.indexOf("run: |") + "run: |".length, step.indexOf("\n        env:")).replace(/^ {10}/gm, "");
  const run = (stubs: { tagExists: boolean; published: boolean }) => {
    const dir = mkdtempSync(join(tmpdir(), "spp-release-"));
    const bin = join(dir, "bin");
    const log = join(dir, "gh.log");
    const write = (name: string, body: string) => {
      writeFileSync(join(bin, name), `#!/bin/sh\n${body}\n`);
      chmodSync(join(bin, name), 0o755);
    };
    mkdirSync(bin);
    write("git", `exit ${stubs.tagExists ? 0 : 2}`);
    write("npm", `exit ${stubs.published ? 0 : 1}`);
    write("gh", `echo "$@" >> "${log}"`);
    writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "@syn54x/spp", version: "2.0.1" }));
    writeFileSync(join(dir, "CHANGELOG.md"), "# @syn54x/spp\n\n## 2.0.1\n\n- fixed a thing\n\n## 2.0.0\n\n- old\n");
    const r = spawnSync("sh", ["-c", script], {
      cwd: dir,
      encoding: "utf8",
      env: { PATH: `${bin}:${process.env.PATH}`, RUNNER_TEMP: dir, GITHUB_SHA: "abc123" },
    });
    assert.equal(r.status, 0, r.stderr);
    return { gh: existsSync(log) ? readFileSync(log, "utf8").trim() : "", notes: existsSync(join(dir, "notes.md")) ? readFileSync(join(dir, "notes.md"), "utf8") : "" };
  };

  test("it runs only on the publish path, after the changesets action", () => {
    assert.ok(release.indexOf("name: tag and release the published version") > release.indexOf("uses: changesets/action@"));
    assert.match(step, /if: steps\.changesets\.outputs\.hasChangesets == 'false'/);
  });

  test("a published version with no tag gets the tag and a release with its changelog section", () => {
    const { gh, notes } = run({ tagExists: false, published: true });
    assert.match(gh, /^release create v2\.0\.1 --target abc123 --title v2\.0\.1 --notes-file \S+notes\.md$/);
    assert.match(notes, /fixed a thing/);
    assert.doesNotMatch(notes, /old/);
  });

  test("an existing tag or an unpublished version creates nothing", () => {
    assert.equal(run({ tagExists: true, published: true }).gh, "");
    assert.equal(run({ tagExists: false, published: false }).gh, "");
  });
});
