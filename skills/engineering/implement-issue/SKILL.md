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

The issue must be **open**, labelled `ready-for-agent`, have **no open blockers** (`blockedBy.nodes[] | select(.state=="OPEN")` is empty), and be **not held, or held by you**. Held means it carries the `claimed` label or has an assignee; held by you means the existing progress comment's **Worker** line names you (your agent name, this run's URL in the cloud, your login). Anything else: stop and report which condition failed, and for a ticket held by someone else, report "held by <name>" from the Worker line (or the assignee). Do not "just start".

The body must carry `## What to build`, `## Acceptance criteria`, `## Files owned` (Create / Modify / Test), `## Interfaces` (Consumes / Produces), `## Test scenarios` and `## Verify`. A missing or placeholder section (`TBD`, empty, "add appropriate error handling", "similar to #N") means the ticket is not buildable: add `needs-info`, remove `ready-for-agent`, write one progress comment saying what is missing, and stop.

Read the laws the gate will cite, all three layers, before any code exists:

- **Repo laws**: the documents on the `Laws:` line of the `<!-- sdd-routing -->` block in `CLAUDE.md` or `AGENTS.md`. When the line is absent, read `CLAUDE.md`, `AGENTS.md`, `GLOSSARY.md`, `CONCEPTS.md`, `CODING_STANDARDS.md`, `CONTRIBUTING.md`, and the ADR directory (`docs/adr/`, or the path the repo's domain docs name), whichever exist. Read a directory selectively: the entries that touch Files owned.
- **Epic laws**: the parent epic body's decisions (`## Implementation Decisions`, `## Testing Decisions`, `## Out of Scope`, as `to-spec` writes them). The parent may live in another repo, so use `gh issue view "$(gh issue view "$N" --json parent --jq .parent.url)"`.
- **Cited laws**: every document the ticket cites.

Note each law that states a trigger (the moment it applies) and the check that discharges it; §4 runs those checks, §6 the rest.

## 2. Claim

Call the Skill tool with "sync-progress" and claim through it: it creates the `claimed` label (with force) and adds it, which is the **Claim mark**. Never add it over a held ticket that is not yours. Resuming a ticket already held by you (a fix round) skips the claim.

Then write the first progress comment (marker `<!-- sdd-progress -->`, status `in-progress`) with the **Worker** line naming you, so a twin run can tell whose mark it is.

## 3. Branch

Determine where you are:

- **Local / worktree worker** (`GITHUB_ACTIONS` unset): the brief names the integration branch. Create `sdd/<N>-<slug>` from the **remote** ref `origin/<integration branch>`, never from `HEAD`: a worktree may start on the default branch. If the brief's first step already put you on `sdd/<N>-<slug>` cut from that ref, stay on it.
  ```bash
  BASE=feat/invoices                                  # from the brief; default main
  SLUG=$(gh issue view "$N" --json title --jq '.title | ascii_downcase | gsub("[^a-z0-9]+";"-") | .[0:40]')
  git fetch origin "$BASE" && git switch -c "sdd/$N-$SLUG" "origin/$BASE"
  ```
- **Cloud** (`GITHUB_ACTIONS=true`): claude-code-action already created the branch and checked it out. Do not create another. The PR targets the repository default branch unless the issue body names an integration branch. The same skill text runs here: the Worker line is this run's URL, and a second run that finds the mark already there stops at §1.

## 4. Build, test-first

Work only inside **Files owned** (its Create, Modify and Test paths). If the slice genuinely needs a file outside that list, you may touch it, but say so in the PR body under **Outside Files owned** with the reason; the reviewer decides whether that is scope creep.

Call the Skill tool with "tdd" for the loop's rules; if it is unavailable, run the same loop by hand: failing test → minimal code → green → refactor. Start from the ticket's **Test scenarios**: one test per line, in the order given, and add any case you discover under the same category headings in the PR body. Follow the in-repo pattern the brief names. Keep the **Produces** signatures in **Interfaces** exactly as the ticket states them; another ticket, possibly in another repo, is coded against those names. The one exit is a declared **Interface deviation**: when an in-repo code signature (function, type, enum, struct) cannot work as written, ship the signature that works, add one `Interfaces changed:` line per deviation to the PR body, and report `DONE_WITH_CONCERNS`. A cross-repo contract (a route and its request/response shapes, an event payload, a generated-client method) and any interface the epic body states never deviate: stop with `NEEDS_CONTEXT`. Import what you **Consume** by the names the producing ticket published; if a name differs in the merged code, stop and report rather than adapt silently. A **Consumes** line from another repo carries an *Available when* clause: if that thing is not reachable from your checkout (the route 404s, the client method is missing), you are `BLOCKED`, not creative.

**Check a law at its trigger.** A law that states a trigger is checked at the trigger, before the line that would do the thing the law names: before a second copy of a derivation or markup, before a component mounted in a second host, before an assertion that an affordance shows. The check is usually a search (the existing copy, the other host, the test that exercises the affordance), and its result is acted on in this PR: extract the one copy, exercise the affordance. A law with no trigger is checked once, in the §6 self-review.

When the ticket touches a docs page or a docstring, call the Skill tool with `writing-for-humans` before writing its prose.

Run the type checker and the single test file you are working in often; run the full suite once, at the end, before Verify. Commit as you go with conventional messages. Do not squash history yourself; the merge does that.

**Stop and escalate** (see *If you get stuck*) rather than guess when: the ticket needs an architectural decision with more than one valid approach; you need to understand code beyond what the brief and ticket gave you and cannot find clarity; you are unsure your approach is right; the work needs restructuring the plan did not anticipate; or you have been reading file after file without progress.

## 5. Verify

Run the ticket's `## Verify` block, verbatim, from the repo root, on the committed state:

```bash
git status --porcelain            # must be empty before Verify counts
# run each command in the Verify block
```

- Green → record it on the commit so hooks and reviewers can see it: `git notes --ref=sdd-verify add -f -m "verified $(date -u +%FT%TZ)" HEAD` and push the note: `git push origin refs/notes/sdd-verify` (ignore failure if notes cannot be pushed; the PR body carries the SHA too).
- Red → fix and repeat. If the Verify block itself is wrong (a command that cannot exist in this repo), do not edit it silently: say so in the progress comment and on the PR body's `Verify block corrected:` line, and run the closest correct command.

Never open the PR with Verify red or un-run.

## 6. Self-review

Before the PR opens, read your own diff (`git diff "origin/$BASE...HEAD"`) once with fresh eyes and fix what you find. A fix is committed, and §5 runs again on the new `HEAD`.

- **Completeness**: every acceptance criterion and every Test scenario has a test; no edge case from the ticket left out.
- **Discipline**: nothing built that was not asked for (YAGNI); in-repo patterns followed; nothing outside Files owned that is not declared.
- **Tests**: they assert behaviour, not mocks; test output is pristine (no stray warnings or noise).
- **Names**: say what things do, not how they work.
- **Laws**: every law from §1, each checked against the diff, including those §4 already checked at their trigger. Write the PR body's `## Laws` section now, from the diff: one line per law that applies, grouped by source (a Laws-line document by rule id where the document has ids, an epic decision by its name, a cited document by the heading it binds), and one `n/a: <reason>` line per source with nothing applying.
- **Interfaces**: list every public symbol the diff adds, removes or re-signs inside Files owned, and match each against the ticket's Produces lines. Each mismatch is either changed back or declared as an **Interface deviation** on its own `Interfaces changed:` line (§4); a mismatch without that line is a failing claim. The line reads `none` only when the list matches the Produces lines exactly.

This self-review does not replace the reviewer; it makes the review shorter.

## 7. Open the PR

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
Verify block corrected: no   <!-- required, never omitted: `no`, or `yes:` plus what was wrong and the command you ran instead -->

## Interfaces

Interfaces changed:   <!-- required, no default: from the §6 symbol list, `none` when every symbol matches a Produces line, else one line per Interface deviation: `<old signature>` → `<new signature>`: <why the ticket's signature could not work as written> -->

## Laws

<!-- required, no default: the §6 Laws lines, one per law that applies, grouped by source, and one `n/a: <reason>` line per source with nothing applying -->

## Notes for the reviewer

<interfaces you exposed, decisions you made that the ticket left open, anything outside Files owned and why; or "none">
```

A `## Laws` section has this shape:

```markdown
- AGENTS.md#I-2: the document shell is extracted once in doors/document; Notes and Name map onto it
- AGENTS.md#I-1, I-3: n/a: no second derivation or host in this diff
- GLOSSARY.md: n/a: no term added or renamed
- epic#Failure law: File all's failure renders under Proposed with Retry
- cited#Register doors: Save sits in the plate's foot, violet
```

`Closes #N` is what links the PR to its ticket, and it closes the ticket when the PR targets the default branch; on an integration branch the orchestrator closes the ticket after the merge. Do not omit the line, and do not close the issue by hand.

## 8. Check the claims, then report

**Claims**, against the pushed branch: every test named in the TDD evidence, and every file or pin the report or PR body says was added or changed, is in `git diff "origin/$BASE...HEAD"`; every test whose file changed after its RED run was run again, and GREEN comes from the final committed state (the Verify SHA equals the pushed `HEAD`, `git rev-parse "origin/sdd/$N-$SLUG"`); `git status --porcelain` is empty, so nothing the report relies on is only uncommitted. Fix a failing claim (commit, re-run Verify, push) or remove it from the report and PR body.

Update the progress comment (status `pr-open`, PR number, Verify SHA). Then reply in ≤ 200 words:

- **Status:** `DONE` | `DONE_WITH_CONCERNS` | `BLOCKED` | `NEEDS_CONTEXT`
- PR link; commits (short SHA + subject)
- **TDD evidence:** the RED command and its failing output before implementation, the GREEN command and passing output after; then the Verify SHA, stated as equal to the pushed `HEAD`
- Concerns, if any; for `BLOCKED` / `NEEDS_CONTEXT`, exactly what you are stuck on, what you tried, and what would unblock you

`DONE_WITH_CONCERNS` means finished but doubtful about correctness or scope. `NEEDS_CONTEXT` means information was missing, not that the work is hard. Never silently produce work you are unsure about. Stop. Review is someone else's job.

## If you get stuck

Stopping is allowed; a wrong PR is not. Missing information → `NEEDS_CONTEXT`; cannot complete → `BLOCKED`. In both cases: Unclaim (`gh issue edit "$N" --remove-label claimed`), set `needs-info` or `ready-for-human` per `sync-progress`, write why in the progress comment, push whatever is committed on your branch, record the state on the commit (`git notes --ref=sdd-verify add -f -m blocked HEAD`, so the verify gate lets you stop), and report with the status and the specifics in the message itself; the orchestrator acts on that directly.
