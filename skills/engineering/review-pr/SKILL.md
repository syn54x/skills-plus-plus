---
name: review-pr
description: Gate a pull request that closes an SDD sub-issue with a fresh reviewer (re-run the ticket's Verify block, judge spec and quality separately, post both verdicts, route failures). Use when build-epic gates a worker's PR, the cloud review workflow runs, or review-panel needs the full-epic spec verdict.
---

# Review PR

Two verdicts, kept apart: **spec** (does the diff do what the sub-issue says?) and **quality** (is it code the repo wants to keep?). A PR can pass one and fail the other; the fix goes back to the author either way. The reviewer never edits code.

This is the **slice** gate: one PR into an integration branch, one fresh reviewer. The PR that takes the integration branch to `main` gets `review-panel` instead.

Usage: `/review-pr <pr# | PR URL>`

Use the URL when the epic spans repos; `gh pr view`, `gh pr diff` and `gh pr checkout` all accept it.

## 1. Fresh eyes

If you are already that fresh reviewer (the `sdd-reviewer` agent, a cloud run, or any session that did not write the code), skip to step 2. Otherwise, if the harness has subagents, dispatch **one fresh reviewer** per PR with this skill and the PR number as its whole context (Claude Code: the `sdd-reviewer` agent from the plugin, or a general-purpose agent with read-only tools plus `gh`). The reviewer must not be the worker and must not inherit the orchestrator's conversation. Without subagents, do the review yourself but only after clearing context of the implementation.

## 2. Gather

```bash
PR=57
gh pr view "$PR" --json number,title,body,baseRefName,headRefName,closingIssuesReferences,files,additions,deletions
N=$(gh pr view "$PR" --json closingIssuesReferences --jq '.closingIssuesReferences[0].number')
gh issue view "$N" --json title,body,parent
gh pr diff "$PR"
```

No `Closes #N` → spec verdict fails immediately (the merge would not close the ticket). Report and stop.

Check out the PR head in a clean worktree (`gh pr checkout "$PR"` in a throwaway worktree, or the Actions checkout) and run the ticket's `## Verify` block yourself. Also check the Verify note, if the worker pushed one: `git notes --ref=sdd-verify show HEAD`.

**Do not trust the report.** The PR body, the progress comment and the worker's message are unverified claims about the code. Verify each against the diff. A stated rationale ("kept it simple per YAGNI", "left it out deliberately") is the worker grading its own work; it never downgrades a finding.

**The diff is your view.** Read it once, with its context lines. Look outside the diff only to check a concrete risk you can name (a changed contract, lock ordering, shared mutable state → check the call sites), one focused check per named risk, and say what you checked. Do not crawl the codebase. Your checkout is read-only: no edits, no staging, no branch changes beyond the checkout itself.

## 3. Spec verdict

Against the sub-issue body only. Ignore how nice the code is. Classify each gap as **Missing** (asked for, not done, or claimed without doing), **Extra** (not asked for: scope creep, over-engineering), or **Misunderstood** (right feature, wrong way).

- Every **acceptance criterion** is met and has a test that would fail without the change.
- Every **Test scenario** line has a corresponding test; a scenario with no test is a spec failure even if the code happens to work.
- **Files owned** respected; anything outside it is declared in the PR body with a reason you accept.
- **Interfaces**: every **Produces** line exists with exactly that signature (names, types, events, routes), and every **Consumes** line is used by the published name, not a local alias. A drift here breaks a sibling ticket, possibly in another repo: for a cross-repo **Produces** (a route, a schema), check the contract against the consuming ticket's Consumes line, not just the local tests.
- **Out of scope** items from the epic are not touched.
- Verify is green on the PR head.
- Something you cannot verify from the diff alone (it lives in unchanged code, or spans tickets) is reported as **Cannot verify** next to the verdict, for the orchestrator to check, not a reason to widen the search.

## 4. Quality verdict

Against the repo's laws (`CLAUDE.md`, `AGENTS.md`, ADRs, the pattern the brief named). Where the repo documents nothing, fall back to the Fowler smell baseline, copied from the `code-review` skill so a reviewer subagent needs nothing else loaded (mysterious name, duplicated code, feature envy, data clumps, primitive obsession, repeated switches, shotgun surgery, divergent change, speculative generality, message chains, middle man, refused bequest); a documented repo standard always overrides a baseline smell.

- Tests are real: they assert behaviour, not implementation details; no `skip`, no snapshot-only.
- Follows the in-repo pattern; no new abstraction where an existing one fits.
- No dead code, debug output, commented-out blocks, TODOs without an issue number.
- Commit history readable; PR body honest.
- Nothing in the diff the ticket did not ask for.

**Severity.** Every finding is **Critical** (wrong behaviour, missed requirement, would corrupt data or break a sibling ticket), **Important** (the PR cannot be trusted until fixed: fragile logic, swallowed errors, tests that assert nothing, verbatim duplication you would block a merge over), or **Minor** (polish, broader coverage). A verdict is FAIL if any Critical or Important finding stands. If the ticket itself mandates something this rubric calls a defect, it is still a finding, labelled *ticket-mandated*; the human decides.

**Confidence gate.** Report a finding only if you can name the line and the failure it causes and you are at least 80% sure it is real; "Consider…" is not a finding. Drop: pre-existing issues the PR did not introduce; code that looks wrong but is not; pedantic nits; anything a linter or the type checker will catch; general quality opinions not backed by a repo law; lines carrying a deliberate lint-ignore.

## 5. Post

One PR review, structured:

```markdown
## Spec: PASS | FAIL
<findings, each: severity · file:line at <sha> · Missing | Extra | Misunderstood · what is wrong · what the ticket says>
Cannot verify: <items, or none>

## Quality: PASS | FAIL
<findings, each: severity · file:line at <sha> · what is wrong · why it matters · fix if not obvious>

Verify: passed | failed on `<short sha>` (`<command that failed>`)
```

Every line is a verdict, a finding, or a check you ran. No preamble, no narration, no closing summary.

```bash
gh pr review "$PR" --comment --body-file /tmp/review.md      # never --approve or --request-changes; the merge decision is the orchestrator's
```

Update the sub-issue's progress comment (call the Skill tool with "sync-progress"): status `verify-passed` / `changes-requested`, and the verdicts.

## 6. Route

- **PASS / PASS** → tell the orchestrator (or, in the cloud path, label the issue `ready-for-human` so a person merges).
- **Any FAIL, first time** → the Critical and Important findings go back to the **same worker** for exactly one fix round (orchestrator resumes it by name; cloud: comment on the issue mentioning the failing items and re-add `ready-for-agent`).
- **When the PR updates** → a **scoped re-review**, not a fresh one: diff only from the head you reviewed to the new head; verdict every finding `ADDRESSED` / `NOT ADDRESSED` with file:line ("attempted" is not addressed; the defect must be gone); flag new Critical/Important breakage in the fix diff; anything you notice outside the fix diff goes under *Out-of-scope observations* and does not block. Re-run Verify.
- **Findings still open after the fix round** → `gh issue edit "$N" --add-label ready-for-human --remove-assignee @me`; leave the PR open with the review on it. Stop. (The orchestrator may choose one ceiling-tier re-dispatch before that; see `build-epic`.)

## Full-epic review

When `build-epic` asks for the integration-branch PR to be gated, run the same two verdicts once over the whole diff, with the **epic body** as the spec instead of a sub-issue. Add a third section, **Coherence**: do the slices agree with each other on the interfaces they shared? This mode is normally reached through `review-panel`, which wraps it with a persona panel for the PR to `main`; the spec and Coherence verdicts stay here so one skill owns "does this match the spec". In a multi-repo epic there is one such PR per repo; review each, and in Coherence check the cross-repo contracts against the *other* repo's integration branch (the frontend's client calls against the backend's routes as merged), since that is the only place the two sides meet before production.
