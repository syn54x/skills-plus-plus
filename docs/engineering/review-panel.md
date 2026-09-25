## What it does

`review-panel` reviews the one PR that takes an epic's integration branch to `main`. It first takes the spec and **Coherence** verdicts from [review-pr](../engineering/review-pr.md)'s full-epic mode (do the slices agree on the interfaces they shared?), then runs several reviewer **personas** over the same diff in parallel: correctness, testing, maintainability, standards and invariants, and history always, plus security, reliability, adversarial, data-migration and API-contract when the diff warrants them. It merges their findings under one severity and confidence scale, numbers them `F1`, `F2`, and writes one report ending in **MERGE**, **FIX FIRST** or **HUMAN DECISION**.

It never edits code, never merges, and never posts the report until you say so.

## When to reach for it

Type `/review-panel <pr#>`, or the agent reaches for it when a PR to `main` needs a panel. [build-epic](../engineering/build-epic.md) calls it for its integration-branch PR. On a slice PR it stops and points to [review-pr](../engineering/review-pr.md): a panel on a slice costs several times as much and finds mostly noise.

## Common questions

**Why are findings numbered `F1` and not `#1`?** GitHub turns a bare `#1` in a comment into a link to issue or PR 1, so a report posted as a comment linked to unrelated work.

**Does it check our ADRs and invariants?** Yes: the standards-and-invariants persona reads `CLAUDE.md`, `AGENTS.md`, `CONTEXT.md`, the coding standards and every ADR, and flags where the diff breaks one. Candidate new ADRs and terminology drift go into [close-epic](../engineering/close-epic.md)'s Learnings.

## It's working if

- The persona set is announced, with a reason for each conditional one, before any reviewer runs.
- The report has one verdict, findings with `F` numbers, file and line, and a Coverage section saying what was dropped and why.
- Nothing is posted to the PR until you approve it.

## Where it fits

`review-panel` is the **main gate** of the SDD chain, after [build-epic](../engineering/build-epic.md) finishes the slices and before you merge to `main`; [close-epic](../engineering/close-epic.md) follows the merge. [ask-syn54x](../engineering/ask-syn54x.md) routes the whole set.
