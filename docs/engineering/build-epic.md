## What it does

`build-epic` takes an epic whose sub-issues have been cut and hardened by [to-tickets](../engineering/to-tickets.md), and builds it with parallel workers. It computes the **ready queue** from the tracker's native links (open, unblocked, unassigned, `ready-for-agent`), groups the tickets into **waves** of three to five, gives each worker its own git worktree, gates every worker's PR with a fresh reviewer, and merges in dependency order onto an integration branch. At the end it opens one PR to `main` and has it panel-reviewed.

The orchestrator never writes code. Everything it knows comes from GitHub (sub-issues, blocking edges, assignees, marker comments), not from the conversation, so a fresh session can pick up an epic where the last one stopped.

## When to reach for it

You invoke this by typing `/build-epic <epic#>`; the agent won't reach for it on its own. It is the one user-invoked step in the build; every skill it drives underneath (`implement-issue`, `review-pr`, `review-panel`, `close-epic`, `sync-progress`) is model-invoked so it can call them.

| The epic is… | Reach for |
| --- | --- |
| Size M or L: several tickets, some parallelisable | `/build-epic <epic#>` |
| More than about eight independent tickets, or you want scripted verify and merge ordering | `/build-epic <epic#> --workflow` (Claude Code only, and only when you opt into a workflow) |
| A single ticket | [implement](../engineering/implement.md) on that issue |
| A `size:S` ticket on a repo with the cloud workflow installed | nothing: label it `ready-for-agent` and the Action builds it |
| Not yet cut into tickets | [to-tickets](../engineering/to-tickets.md) first |

## Prerequisites

- [setup-syn54x-skills](../engineering/setup-syn54x-skills.md) has run with the SDD pipeline on, so the repo carries the `<!-- sdd-routing -->` block and the labels.
- The epic has sub-issues and a `<!-- sdd-plan -->` comment, both written by `to-tickets`'s SDD pass.
- `gh` 2.94 or newer. For a multi-repo epic, a local checkout of every repo involved.

## Waves, not a team

Each worker is an isolated subagent in its own worktree, branched from the integration branch, handed a written brief and nothing else. Before each wave the orchestrator runs a parallel-safety check over the tickets' **Files owned** and **Interfaces**: two tickets that touch the same file, migration series or lockfile, or that produce and consume the same interface, never run in the same wave. It shows you the first wave's plan and waits for approval; later waves that follow the plan launch on their own.

A worker's PR goes to [review-pr](../engineering/review-pr.md). A failing review sends the findings back to the same worker for exactly one fix round; findings still open after that go to `ready-for-human`. A merge conflict is never hand-resolved: the worker rebases and re-runs Verify.

## Common questions

**Why did my workers stall before writing any code?** In the pack this replaces, the worker had to start a user-invoked skill, which no agent can do. Here `implement-issue` is model-invoked and the `sdd-worker` agent preloads it, and `scripts/check-invocation.py` fails CI if any skill or agent calls a user-invoked skill again.

**Does it merge to `main`?** No. It merges slices into the integration branch; the PR to `main` is reviewed by [review-panel](../engineering/review-panel.md) and merged by you. [close-epic](../engineering/close-epic.md) runs after that merge, not before.

**Can I use Agent Teams instead of worktree waves?** Not in the same session. Teammates get no worktree isolation and cost several times the tokens; the skill stops if the Agent Teams flag is set.

## It's working if

- Each worker's PR touches only its ticket's Files owned, and says `Closes #N`.
- The epic carries one `<!-- sdd-wave -->` comment that updates in place, with an `Edges added:` line.
- Nothing is merged to `main` by the agent, and every slice PR has a review comment with separate Spec and Quality verdicts.
- A worker that could not finish shows up as `ready-for-human` with its PR left open, not as a silent stop.

## Where it fits

`build-epic` is the **build step** of the SDD chain: [grill-with-docs](../engineering/grill-with-docs.md) → [to-spec](../engineering/to-spec.md) → [to-tickets](../engineering/to-tickets.md) → `build-epic` → [review-panel](../engineering/review-panel.md) → [close-epic](../engineering/close-epic.md). For which skill to reach for next, [ask-syn54x](../engineering/ask-syn54x.md) routes the whole set.
