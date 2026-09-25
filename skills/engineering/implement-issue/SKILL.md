---
name: implement-issue
description: Implement one ready SDD sub-issue end to end (claim, branch, TDD, run its Verify block, open a PR that closes it, keep the progress comment current). Use when a build-epic worker, the cloud workflow, or implement is handed an issue that carries Files owned, Interfaces and a Verify block.
---

# Implement Issue

One worker, one issue, one PR. You are given an issue number; everything else you need is in that issue and in the repo's laws. You do not merge, you do not touch other tickets, and you do not dispatch subagents.

Usage: `/implement-issue <N | issue URL>`

A bare number means "in the repo I am standing in". A URL names the repo explicitly; use it whenever the epic spans repos. Every `gh issue` command below accepts either, so `$N` may be a URL throughout.

## 1. Read and check readiness

```bash
N=103                                   # or https://github.com/owner/pinch-backend/issues/103
gh issue view "$N" --json number,title,url,body,state,labels,assignees,parent,blockedBy
gh issue view "$N" --comments
```

Confirm you are standing in a checkout of the **ticket's** repo: the `url` field's `owner/repo` must equal `gh repo view --json nameWithOwner --jq .nameWithOwner`. If it does not, stop and report; the PR must be opened in the repo the ticket lives in, so that `Closes #N` closes it.

The issue must be **open**, labelled `ready-for-agent`, have **no open blockers** (`blockedBy.nodes[] | select(.state=="OPEN")` is empty), and be **unassigned or assigned to you**. Anything else: stop and report which condition failed. Do not "just start".

The body must carry `## What to build`, `## Acceptance criteria`, `## Files owned` (Create / Modify / Test), `## Interfaces` (Consumes / Produces), `## Test scenarios` and `## Verify`. A missing or placeholder section (`TBD`, empty, "add appropriate error handling", "similar to #N") means the ticket is not buildable: add `needs-info`, remove `ready-for-agent`, write one progress comment saying what is missing, and stop.

Read the parent epic body once for the decisions that bind you (`## Implementation Decisions`, `## Testing Decisions`, `## Out of Scope`, as `to-spec` writes them); the parent may live in another repo, so use `gh issue view "$(gh issue view "$N" --json parent --jq .parent.url)"`. Read `CLAUDE.md`/`AGENTS.md`, `CONTEXT.md` and any ADR that touches the files you own.

## 2. Claim

```bash
gh issue edit "$N" --add-assignee @me
```

Then write the first progress comment (call the Skill tool with "sync-progress"; marker `<!-- sdd-progress -->`, status `in-progress`).

## 3. Branch

Determine where you are:

- **Local / worktree worker** (`GITHUB_ACTIONS` unset): the brief names the integration branch. Create `sdd/<N>-<slug>` from it:
  ```bash
  BASE=feat/invoices                                  # from the brief; default main
  SLUG=$(gh issue view "$N" --json title --jq '.title | ascii_downcase | gsub("[^a-z0-9]+";"-") | .[0:40]')
  git fetch origin "$BASE" && git switch -c "sdd/$N-$SLUG" "origin/$BASE"
  ```
- **Cloud** (`GITHUB_ACTIONS=true`): claude-code-action already created the branch and checked it out. Do not create another. The PR targets the repository default branch unless the issue body names an integration branch.

## 4. Build, test-first

Work only inside **Files owned** (its Create, Modify and Test paths). If the slice genuinely needs a file outside that list, you may touch it, but say so in the PR body under **Outside Files owned** with the reason; the reviewer decides whether that is scope creep.

Call the Skill tool with "tdd" for the loop's rules; if it is unavailable, run the same loop by hand: failing test → minimal code → green → refactor. Start from the ticket's **Test scenarios**: one test per line, in the order given, and add any case you discover under the same category headings in the PR body. Follow the in-repo pattern the brief names. Keep the **Produces** signatures in **Interfaces** exactly as the ticket states them; another ticket, possibly in another repo, is coded against those names. Import what you **Consume** by the names the producing ticket published; if a name differs in the merged code, stop and report rather than adapt silently. A **Consumes** line from another repo carries an *Available when* clause: if that thing is not reachable from your checkout (the route 404s, the client method is missing), you are `BLOCKED`, not creative.

Run the type checker and the single test file you are working in often; run the full suite once, at the end, before Verify. Commit as you go with conventional messages. Do not squash history yourself; the merge does that.

**Stop and escalate** (see *If you get stuck*) rather than guess when: the ticket needs an architectural decision with more than one valid approach; you need to understand code beyond what the brief and ticket gave you and cannot find clarity; you are unsure your approach is right; the work needs restructuring the plan did not anticipate; or you have been reading file after file without progress.

## 5. Verify

Run the ticket's `## Verify` block, verbatim, from the repo root, on the committed state:

```bash
git status --porcelain            # must be empty before Verify counts
# run each command in the Verify block
```

- Green → record it on the commit so hooks and reviewers can see it: `git notes --ref=sdd-verify add -f -m "verified $(date -u +%FT%TZ)" HEAD` and push the note: `git push origin refs/notes/sdd-verify` (ignore failure if notes cannot be pushed; the PR body carries the SHA too).
- Red → fix and repeat. If the Verify block itself is wrong (a command that cannot exist in this repo), do not edit it silently: say so in the progress comment and in the PR body, and run the closest correct command.

Never open the PR with Verify red or un-run.

## 6. Open the PR

```bash
git push -u origin "sdd/$N-$SLUG"
gh pr create --base "$BASE" --title "<type>: <ticket title> (#$N)" --body-file /tmp/pr.md
```

PR body:

```markdown
Closes #<N>

## What

<two or three lines: the behaviour this PR makes work>

## Verify

Ran the ticket's Verify block on `<short sha>`: passed.
TDD: RED `<command>` failed as expected (<one line>); GREEN `<command>` passed (<n/n>).
Verify block corrected: no   <!-- yes, plus what was wrong, when the block could not run as written -->

## Notes for the reviewer

<interfaces you exposed, decisions you made that the ticket left open, anything outside Files owned and why; or "none">
```

`Closes #N` is what closes the sub-issue on merge; do not omit it, do not close the issue by hand.

## 7. Self-review, then report

Before reporting, read your own diff once with fresh eyes and fix what you find:

- **Completeness**: every acceptance criterion and every Test scenario has a test; no edge case from the ticket left out.
- **Discipline**: nothing built that was not asked for (YAGNI); in-repo patterns followed; nothing outside Files owned that is not declared.
- **Tests**: they assert behaviour, not mocks; test output is pristine (no stray warnings or noise).
- **Names**: say what things do, not how they work.

This self-review does not replace the reviewer; it makes the review shorter.

Update the progress comment (status `pr-open`, PR number, Verify SHA). Then reply in ≤ 200 words:

- **Status:** `DONE` | `DONE_WITH_CONCERNS` | `BLOCKED` | `NEEDS_CONTEXT`
- PR link; commits (short SHA + subject)
- **TDD evidence:** the RED command and its failing output before implementation, the GREEN command and passing output after; then the Verify SHA
- Concerns, if any; for `BLOCKED` / `NEEDS_CONTEXT`, exactly what you are stuck on, what you tried, and what would unblock you

`DONE_WITH_CONCERNS` means finished but doubtful about correctness or scope. `NEEDS_CONTEXT` means information was missing, not that the work is hard. Never silently produce work you are unsure about. Stop. Review is someone else's job.

## If you get stuck

Stopping is allowed; a wrong PR is not. Missing information → `NEEDS_CONTEXT`; cannot complete → `BLOCKED`. In both cases: Unclaim (`gh issue edit "$N" --remove-assignee @me`), set `needs-info` or `ready-for-human` per `sync-progress`, write why in the progress comment, push whatever is committed on your branch, record the state on the commit (`git notes --ref=sdd-verify add -f -m blocked HEAD`, so the verify gate lets you stop), and report with the status and the specifics in the message itself; the orchestrator acts on that directly.
