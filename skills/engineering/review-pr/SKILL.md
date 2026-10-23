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

No `Closes #N` → spec verdict fails immediately (the PR is not linked to its ticket, and the orchestrator cannot tell which sub-issue the merge completes). Report and stop.

Check out the PR head in a clean worktree (`gh pr checkout "$PR"` in a throwaway worktree, or the Actions checkout) and run the ticket's `## Verify` block yourself. Also check the Verify note, if the worker pushed one: `git notes --ref=sdd-verify show HEAD`.

**Trial merge.** Two slices can each be green on their own heads and red together. Check whether the base moved since the PR branched:

```bash
BASE=$(gh pr view "$PR" --json baseRefName --jq .baseRefName)
git fetch origin "$BASE"
MB=$(git merge-base HEAD "origin/$BASE")
git log --oneline "$MB..origin/$BASE"     # empty: the base has not moved, one Verify run as above
```

If that lists commits, run Verify a second time on a local trial merge of the PR head into the current base, in the same throwaway worktree: `git switch --detach && git merge --no-edit "origin/$BASE"`, then the Verify block again. The trial merge is never pushed; discard the worktree when you are done. A textual conflict is a result, not a task: record the conflicting files (`git diff --name-only --diff-filter=U`), `git merge --abort`, and do not resolve it, since picking a side discards one ticket's intent. This applies to slice PRs; full-epic mode below is unchanged.

**Do not trust the report.** The PR body, the progress comment and the worker's message are unverified claims about the code. Verify each against the diff. A stated rationale ("kept it simple per YAGNI", "left it out deliberately") is the worker grading its own work; it never downgrades a finding.

**The diff is your view.** Read it once, with its context lines. Look outside the diff only to check a concrete risk you can name (a changed contract, lock ordering, shared mutable state → check the call sites), one focused check per named risk, and say what you checked. The one standing carve-out is step 4's depth check. Do not crawl the codebase. Your checkout is read-only: no edits, no staging, no branch changes beyond the checkout itself and the unpushed trial merge.

## 3. Spec verdict

Against the sub-issue body only. Ignore how nice the code is. Classify each gap as **Missing** (asked for, not done, or claimed without doing), **Extra** (not asked for: scope creep, over-engineering), or **Misunderstood** (right feature, wrong way).

- Every **acceptance criterion** is met and has a test that would fail without the change.
- Every **Test scenario** line has a corresponding test; a scenario with no test is a spec failure even if the code happens to work.
- **Files owned** respected; anything outside it is declared in the PR body with a reason you accept.
- **Interfaces**: every **Produces** line exists with exactly that signature (names, types, events, routes), and every **Consumes** line is used by the published name, not a local alias. A drift here breaks a sibling ticket, possibly in another repo: for a cross-repo **Produces** (a route, a schema), check the contract against the consuming ticket's Consumes line, not just the local tests. A Produces line the PR body declares on an `Interfaces changed:` line is an **Interface deviation**: check the shipped code against the declared new signature instead, and confirm it is an in-repo code signature, since a cross-repo contract or an interface the epic states never deviates (a deviation there is Critical). A Produces signature that differs from the ticket without that line is an Important finding.
- **Out of scope** items from the epic are not touched.
- A `**Narrows:**` line in the ticket is accepted scope: the user approved that narrowing when the tickets were cut, so the behaviour it names is judged against the ticket, not the epic. A ticket that delivers less than the epic states *without* that line is a **Missing** finding, labelled *ticket-mandated* if the ticket's own criteria asked for less.
- Verify is green on the PR head and, when step 2 ran one, on the trial merge. Red only on the trial merge is a **Critical** finding (it breaks a sibling ticket) naming the base commits since `$MB` that it comes from, narrowed to those touching the failing files where you can tell. A trial-merge conflict is a **Critical** finding listing the conflicting files and those base commits, left unresolved; the fix round is the worker's rebase.
- Something you cannot verify from the diff alone (it lives in unchanged code, or spans tickets) is reported as **Cannot verify** next to the verdict, for the orchestrator to check, not a reason to widen the search.

## 4. Quality verdict

Against the repo's **Laws**: the documents on the `Laws:` line of the `<!-- sdd-routing -->` block in `CLAUDE.md` or `AGENTS.md`, or, when the repo has no such line, `CLAUDE.md`, `AGENTS.md`, `GLOSSARY.md`, `CONCEPTS.md`, `CODING_STANDARDS.md`, `CONTRIBUTING.md`, and the ADR directory (`docs/adr/`, or the path the repo's domain docs name); plus the pattern the brief named. Where the repo documents nothing, fall back to the Fowler smell baseline, copied from the `code-review` skill so a reviewer subagent needs nothing else loaded (mysterious name, duplicated code, feature envy, data clumps, primitive obsession, repeated switches, shotgun surgery, divergent change, speculative generality, message chains, middle man, refused bequest); a documented repo standard always overrides a baseline smell.

- Tests are real: they assert behaviour, not implementation details; no `skip`, no snapshot-only.
- Follows the in-repo pattern; no new abstraction where an existing one fits.
- No dead code, debug output, commented-out blocks, TODOs without an issue number.
- Commit history readable; PR body honest.
- The Verify the worker ran (the PR body and progress comment) matches the ticket's block, or the PR body says `Verify block corrected: yes` with what was wrong. A difference under `Verify block corrected: no`, or a PR body with no such line, is an **Important** finding: a silent correction hides a ticket that lied.
- The PR body's `## Laws` section is a set of claims, one line per Law: verify each against the diff. A line the diff contradicts is a finding tagged with that Law. An `n/a` on a Law whose trigger the diff hits is a finding tagged with that Law. A PR body with no `## Laws` section is an **Important** finding tagged `[skill#Laws section]`, by the same rule as a missing `Verify block corrected:` line: an absent claim cannot be checked.
- Nothing in the diff the ticket did not ask for.
- Every declared **Interface deviation** was **needed**: the PR's reason shows the ticket's signature could not work as written. An unneeded one is an Important finding whose fix is reverting to the ticket's signature.

**Depth check.** Call the Skill tool with "codebase-design" and run its `DEPTH-CHECK.md` over every module the PR adds or whose interface it changes: read as that file says, ask its four questions, and report each fired check as a finding, category `depth`, at the severity and anchor its gate table gives.

**Severity.** Every finding is **Critical** (wrong behaviour, missed requirement, would corrupt data or break a sibling ticket), **Important** (the PR cannot be trusted until fixed: fragile logic, swallowed errors, tests that assert nothing, verbatim duplication you would block a merge over, a shallow module the PR introduced per the depth check), or **Minor** (polish, broader coverage). A verdict is FAIL if any Critical or Important finding stands. If the ticket itself mandates something this rubric calls a defect, it is still a finding, labelled *ticket-mandated*; the human decides.

**Confidence gate.** Report a finding only if you can name the line and the failure it causes and you are at least 80% sure it is real; "Consider…" is not a finding. Drop: pre-existing issues the PR did not introduce (the one exception is the depth check's question 3, an already-shallow module the PR touched, which its gate table keeps at Minor); code that looks wrong but is not; pedantic nits; anything a linter or the type checker will catch; general quality opinions not backed by a repo law; lines carrying a deliberate lint-ignore.

**Law tag.** Every finding, Spec and Quality, names the Law it cites in one token right after its severity, so the retro counts findings by source with no extra review work:

```
- <severity> · [<source>#<id>] · <file:line at sha> · <the rest of the finding>
source  = a path as written on the Laws line | ADR-<nnnn> | epic | ticket | cited | skill | none
id      = the rule's own id or heading (I-5, Failure law, Interfaces, Register doors, Laws section); omitted after none
```

A repo rule takes its file as prefix (`[AGENTS.md#I-6]`); `epic` carries the decision's name (`[epic#Failure law]`); `ticket` the section (`[ticket#Interfaces]`, `[ticket#Test scenarios]`, `[ticket#Acceptance criteria]`, `[ticket#Files owned]`); `cited` the document the ticket names (`[cited#Register doors]`); `skill` a rule of the SDD skills themselves, by the skill's own name for it (`[skill#Laws section]`, `[skill#Verify block corrected]`, `[skill#Verify]` for Verify not run on the head). Plain logic and test gaps that no document and no skill rule names are `[none]`.

## 5. Post

One PR review, structured:

```markdown
## Spec: PASS | FAIL
- <severity> · [<source>#<id>] · <file:line at sha> · Missing | Extra | Misunderstood · what is wrong · what the ticket says
Cannot verify: <items, or none>

## Quality: PASS | FAIL
- <severity> · [<source>#<id>] · <file:line at sha> · what is wrong · why it matters · fix if not obvious

Verify: PR head `<short sha>` passed | failed (`<command that failed>`)
Trial merge: not run (base unchanged) | `<short sha>` into `<base>` at `<short sha>` passed | failed (`<command that failed>`) | conflict (`<files>`)
```

Every line is a verdict, a finding, or a check you ran. No preamble, no narration, no closing summary.

```bash
gh pr review "$PR" --comment --body-file /tmp/review.md      # never --approve or --request-changes; the merge decision is the orchestrator's
```

Update the sub-issue's progress comment (call the Skill tool with "sync-progress"): status `verify-passed` / `changes-requested`, and the verdicts.

## 6. Route

- **PASS / PASS** → tell the orchestrator (or, in the cloud path, label the issue `ready-for-human` so a person merges).
- **Any FAIL, first time** → the Critical and Important findings go back to the **same worker** for exactly one fix round (orchestrator resumes it by name). Cloud: there is no fix round, because a cloud run cannot resume a held ticket today (its Worker line is the run URL, and the trigger skips a claimed issue). Comment on the issue naming the failing items, `gh issue edit "$N" --add-label ready-for-human`, and unclaim through `sync-progress` (call the Skill tool with "sync-progress"; its Claim and unclaim section removes the mark); leave the PR open with the review on it. Stop.
- **When the PR updates** → a **scoped re-review**, not a fresh one: diff only from the head you reviewed to the new head; verdict every finding `ADDRESSED` / `NOT ADDRESSED` with file:line ("attempted" is not addressed; the defect must be gone), with no Law tag since the finding it answers already carries one; flag new Critical/Important breakage in the fix diff as findings with their Law tag; anything you notice outside the fix diff goes under *Out-of-scope observations* and does not block. Re-run Verify by step 2's rule: on the new head, and on a fresh trial merge if the base has moved since the new head's merge base.
- **Findings still open after the fix round** → `gh issue edit "$N" --add-label ready-for-human`, and unclaim through `sync-progress` (call the Skill tool with "sync-progress"; its Claim and unclaim section removes the mark); leave the PR open with the review on it. Stop. (The orchestrator may choose one ceiling-tier re-dispatch before that; see `build-epic`.)

## Full-epic review

When `build-epic` asks for the integration-branch PR to be gated, run the same two verdicts once over the whole diff, with the **epic body** as the spec instead of a sub-issue. Skip the depth check here: `review-panel`'s `depth` persona runs it over the same diff. Read the `**Narrowed:**` line of the epic's `<!-- sdd-plan -->` comment first: each entry there is accepted scope, and the epic behaviour it names is judged as narrowed. Any other shortfall against the epic is a Missing finding, even where a ticket asked for it. Findings carry Law tags here too; a shortfall against the epic body is `[epic#<decision>]`. Add a third section, **Coherence**: do the slices agree with each other on the interfaces they shared? Read the plan comment's `**Deviated:**` line too: each entry there is an accepted **Interface deviation**, so judge its producer and consumers against the new signature, not the one the ticket first stated. This mode is normally reached through `review-panel`, which wraps it with a persona panel for the PR to `main`; the spec and Coherence verdicts stay here so one skill owns "does this match the spec". In a multi-repo epic there is one such PR per repo; review each, and in Coherence check the cross-repo contracts against the *other* repo's integration branch (the frontend's client calls against the backend's routes as merged), since that is the only place the two sides meet before production.
