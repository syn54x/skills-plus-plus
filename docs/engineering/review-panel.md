## What it does

`review-panel` reviews the one PR that takes an epic's integration branch to `main`. It first takes the spec and **Coherence** verdicts from [review-pr](../engineering/review-pr.md)'s full-epic mode (do the slices agree on the interfaces they shared?), then runs several reviewer **personas** over the same diff in parallel: correctness, testing, maintainability, standards and invariants, history, and depth always, plus security, reliability, adversarial, data-migration and API-contract when the diff warrants them. It merges their findings under one severity and confidence scale, numbers them `F1`, `F2`, and writes one report ending in **MERGE**, **FIX FIRST** or **HUMAN DECISION**.

It never edits code, never merges, and never posts the report until you say so.

## When to reach for it

Type `/review-panel <pr#>`, or the agent reaches for it when a PR to `main` needs a panel. [build-epic](../engineering/build-epic.md) calls it for its integration-branch PR. On a slice PR it stops and points to [review-pr](../engineering/review-pr.md): a panel on a slice costs several times as much and finds mostly noise.

## Common questions

**After FIX FIRST, does it run the whole panel again?** No, it runs a narrower re-review. Fix slices that each pass their own gate can still break where they meet, so the re-review checks each earlier finding by id, re-runs the Spec and Coherence verdicts on the fixed head, and runs a **Composition pass**: the always-on personas, plus any conditional the fix diff warrants, reading all of that round's fixes as one diff. Its report opens with `Round 2` (or `Round 3`), is posted only when you say so, and leaves the first report untouched. After two fix rounds, anything still blocking comes to you as **HUMAN DECISION** instead of a third round.

**Why are findings numbered `F1` and not `#1`?** GitHub turns a bare `#1` in a comment into a link to issue or PR 1, so a report posted as a comment linked to unrelated work.

**A finding says `ticket-mandated`. What do I do with it?** A ticket told the worker to do something the rubric calls a defect, and the panel reports it anyway so the decision is yours. One case is exempt: a narrowing that the epic's plan comment lists under `Narrowed:` was approved when [to-tickets](../engineering/to-tickets.md) cut the plan, so the panel judges that behaviour as narrowed and not as missing.

**What does the depth persona do that maintainability does not?** It runs the **depth check** from [codebase-design](../engineering/codebase-design.md): the four questions about shallow modules, extracted-for-testability functions, tests past an interface, and already-shallow modules the PR touched. It is the one persona allowed to read past the diff, bounded to each module the PR adds or whose interface it changes, with its callers and tests. Its Important findings block like any other; its Minor ones are the follow-up deepenings, and they travel with candidate ADRs into [close-epic](../engineering/close-epic.md)'s Learnings so you file them from one place. Prose-only diffs skip it.

**Does it check our ADRs and invariants?** Yes: the standards-and-invariants persona reads `CLAUDE.md`, `AGENTS.md`, `GLOSSARY.md`, the coding standards and every ADR, and flags where the diff breaks one. Candidate new ADRs and terminology drift go into [close-epic](../engineering/close-epic.md)'s Learnings.

## It's working if

- The persona set is announced, with a reason for each conditional one, before any reviewer runs.
- The report has one verdict, findings with `F` numbers, file and line, and a Coverage section saying what was dropped and why.
- Nothing is posted to the PR until you approve it.
- After a fix round, a separate `Round 2` report says `ADDRESSED` or `NOT ADDRESSED` for each earlier `F` number and lists only the new findings.

## Where it fits

`review-panel` is the **main gate** of the SDD chain, after [build-epic](../engineering/build-epic.md) finishes the slices and before you merge to `main`; [close-epic](../engineering/close-epic.md) follows the merge. [ask-syn54x](../engineering/ask-syn54x.md) routes the whole set.
