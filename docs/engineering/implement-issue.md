## What it does

`implement-issue` builds one SDD sub-issue end to end: it checks the issue is ready, claims it by assignment, branches `sdd/<N>-<slug>`, drives the tests from the ticket's **Test scenarios**, runs the ticket's **Verify** block, records that run as a git note, and opens a PR with `Closes #N`. It keeps one progress comment on the issue current throughout. It never merges and never touches another ticket.

The ticket is the whole world. A worker running this skill sees the issue, the epic it belongs to and the repo's laws, never the conversation that produced them, which is why [to-tickets](../engineering/to-tickets.md)'s SDD pass makes every ticket carry Files owned, Interfaces and Verify.

## When to reach for it

Type `/implement-issue <N>`, or the agent reaches for it when it is handed an SDD sub-issue. In practice something else usually starts it:

| Started by | How |
| --- | --- |
| [build-epic](../engineering/build-epic.md) | each worker calls it for its ticket, inside its own worktree |
| The cloud workflow | `sdd-implement.yml` runs it when a `size:S` issue gains `ready-for-agent` |
| [implement](../engineering/implement.md) | `/implement #N` hands off to it when the issue is an SDD sub-issue |
| You | `/implement-issue <N>` for a single ticket outside a wave |

For work that is not an SDD sub-issue (a spec, a plain ticket, the conversation), use [implement](../engineering/implement.md).

## Prerequisites

The issue must be open, unblocked, unassigned and labelled `ready-for-agent`. On a local run, the skills-plus-plus plugin's Stop hook refuses to let the session finish on an `sdd/*` branch until the Verify run is recorded as a git note on `HEAD`.

## Common questions

**Why can't it stop?** The Stop hook is doing its job: the tree is dirty or there is no Verify note on `HEAD`. Run the Verify block and record it, or, if the ticket is blocked, unclaim it and record a `blocked` note instead.

**Why is it model-invoked when `implement` is not?** Workers and the cloud workflow have to start it without a human typing it. A user-invoked skill cannot be reached by another skill or agent at all.

## It's working if

- The PR says `Closes #N`, targets the integration branch named in the brief, and touches only Files owned (anything else is declared in the PR body).
- `git notes --ref=sdd-verify show HEAD` on the PR head says `verified`.
- The issue has exactly one `<!-- sdd-progress -->` comment, rewritten as the work moves.

## Where it fits

`implement-issue` is the **worker step** under [build-epic](../engineering/build-epic.md), and the cloud path's builder. Its output goes straight to [review-pr](../engineering/review-pr.md). [ask-syn54x](../engineering/ask-syn54x.md) routes the whole set.
