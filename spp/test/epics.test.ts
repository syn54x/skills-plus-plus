import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { epicsArgs, readEpics } from "../src/snapshot.ts";

const trailer = (data: unknown) => `<!-- sdd-data: ${Buffer.from(JSON.stringify(data)).toString("base64")} -->`;
const plan = (branch: string, association = "OWNER") => ({
  body: `<!-- sdd-plan -->\n${trailer({ branch })}`,
  author: { login: "someone" },
  authorAssociation: association,
});
const issue = (number: number, total: number, completed: number, comments: unknown[] = []) => ({
  number,
  url: `https://github.com/o/r/issues/${number}`,
  title: `Epic ${number}`,
  subIssuesSummary: { total, completed },
  comments: { nodes: comments },
});
const result = (...nodes: unknown[]) => ({
  exitCode: 0,
  stdout: JSON.stringify({ data: { viewer: { login: "maint" }, repository: { issues: { nodes } } } }),
});

describe("readEpics", () => {
  test("keeps an Epic with unmerged Sub-issues and reads its integration branch", () => {
    assert.deepEqual(readEpics(result(issue(7, 3, 2, [plan("feat/x")]))), [
      { number: 7, url: "https://github.com/o/r/issues/7", title: "Epic 7", total: 3, completed: 2, branch: "feat/x" },
    ]);
  });

  test("drops an issue with no Sub-issues and one with every Sub-issue completed", () => {
    assert.deepEqual(readEpics(result(issue(1, 0, 0), issue(2, 2, 2, [plan("feat/y")]))), []);
  });

  test("an untrusted plan comment gives a null branch", () => {
    assert.equal(readEpics(result(issue(3, 2, 0, [plan("feat/evil", "NONE")])))[0].branch, null);
  });

  test("a non-zero exit throws gh's first stderr line", () => {
    assert.throws(() => readEpics({ exitCode: 1, stdout: "", stderr: "HTTP 401: Bad credentials\nhint" }), /^Error: HTTP 401: Bad credentials$/);
  });
});

test("epicsArgs queries the current repo", () => {
  const args = epicsArgs();
  assert.deepEqual(args.slice(0, 2), ["api", "graphql"]);
  assert.ok(args.includes("owner={owner}") && args.includes("repo={repo}"));
});
