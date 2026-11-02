import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
