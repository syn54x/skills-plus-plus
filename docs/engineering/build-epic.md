## What it does

`build-epic` takes an epic whose sub-issues have been cut and hardened by [to-tickets](../engineering/to-tickets.md), and builds it with parallel workers. It computes the **ready queue** from the tracker's native links (open, unblocked, not held, `ready-for-agent`), groups the tickets into **waves** of three to five, gives each worker its own git worktree, gates every worker's PR with a fresh reviewer, and merges in dependency order onto an integration branch. At the end it opens one PR to `main` and has it panel-reviewed.

A ticket is **held** when it carries the `claimed` label or an assignee, and a held ticket stays out of the ready queue either way. Each worker claims its own ticket with the label, so the orchestrator only writes the brief and dispatches; a person who assigns themselves holds the ticket too, so no worker takes it.

The orchestrator never writes code. Everything it knows comes from GitHub (sub-issues, blocking edges, the `claimed` label and assignees, marker comments), not from the conversation, so a fresh session can pick up an epic where the last one stopped.

## When to reach for it

You invoke this by typing `/build-epic <epic#>`; the agent won't reach for it on its own. It is the one user-invoked step in the build; every skill it drives underneath (`implement-issue`, `review-pr`, `review-panel`, `close-epic`, `sync-progress`) is model-invoked so it can call them.

| The epic is… | Reach for |
| --- | --- |
| Size M or L: several tickets, some parallelisable | `/build-epic <epic#>` |
| More than about eight independent tickets, or you want scripted verify and merge ordering | `/build-epic <epic#> --workflow` (Claude Code only, and only when you opt into a workflow) |
| A single ticket | [implement](../engineering/implement.md) on that issue |
| Not yet cut into tickets | [to-tickets](../engineering/to-tickets.md) first |

## Prerequisites

- [setup-syn54x-skills](../engineering/setup-syn54x-skills.md) has run with the SDD pipeline on, so the repo carries the `<!-- sdd-routing -->` block and the labels.
- The epic has sub-issues and a `<!-- sdd-plan -->` comment, both written by `to-tickets`'s SDD pass.
- `gh` 2.94 or newer. For a multi-repo epic, a local checkout of every repo involved.

## Waves, not a team

Each worker is an isolated subagent in its own worktree, branched from the integration branch, handed a written brief and nothing else. The orchestrator reads each repo's Laws line once, and the brief's Laws section names that line's sources (or the fallback list), the epic decisions that bind the slice, and anything the orchestrator would otherwise review for, rather than a paraphrase of the laws the worker reads anyway. Before each wave the orchestrator runs a parallel-safety check over the tickets' **Files owned** and **Interfaces**: two tickets that touch the same file, migration series or lockfile, or that produce and consume the same interface, never run in the same wave. It shows you the first wave's plan and waits for approval; later waves that follow the plan launch on their own.

A worker's PR goes to [review-pr](../engineering/review-pr.md). A failing review sends the findings back to the same worker for exactly one fix round; findings still open after that go to `ready-for-human`. A merge conflict is never hand-resolved: the worker rebases and re-runs Verify. After each merge the orchestrator runs that ticket's scoped Verify on the integration branch and reads CI's run there before merging the next; the full suite is CI's run, not an agent's. If no CI workflow has a push trigger for the integration branch, the plan comment says so once, and the orchestrator runs the full suite locally once after each merge instead.

The PR to `main` goes to [review-panel](../engineering/review-panel.md). A **FIX FIRST** verdict sends its findings to the workers that own the files; a class of finding that spans several tickets' files goes whole to one worker. Each fix slice's PR refers to its ticket with `Refs #N` rather than closing it, because the ticket is already closed, and names the panel finding it fixes. Once those fix slices merge, the panel re-reviews the new head: each earlier finding checked by id, the Spec and Coherence verdicts re-run, and a **Composition pass** over the fix slices together. That loop runs at most twice; still FIX FIRST after the second fix round, it comes to you as **HUMAN DECISION**. If you answer that with a fix, you get one **overtime** round per answer, re-reviewed as `Round 4`, `Round 5` and on.

## Common questions

**Why did my workers stall before writing any code?** In the pack this replaces, the worker had to start a user-invoked skill, which no agent can do. Here `implement-issue` is model-invoked and the `sdd-worker` agent preloads it, and `scripts/check-invocation.py` fails CI if any skill or agent calls a user-invoked skill again.

**Does it merge to `main`?** No. It merges slices into the integration branch; the PR to `main` is reviewed by [review-panel](../engineering/review-panel.md) and merged by you. [close-epic](../engineering/close-epic.md) runs after that merge, not before.

**My sub-issues stayed open after their PRs merged.** GitHub honours `Closes #N` only on a PR into the default branch, so a merge into `feat/<slug>` closes nothing by itself. The orchestrator now closes each sub-issue after its gated merge, if it is still open; the worker's `Closes #N` stays because it links the PR to the ticket, and it does the closing in the one-ticket case that targets `main`.

**The epic closed the moment I merged the PR to `main`. Did I skip something?** No, that is the intended path: the integration PR says `Closes #<epic>` so the epic closes when the work lands. [close-epic](../engineering/close-epic.md) still runs afterwards and posts the summary and retro against the closed epic. In a multi-repo epic only the PR in the epic's own repo carries that line, so a repo that holds tasks but no epic closes nothing.

**A merged slice shipped a different signature from its ticket. Who fixes the consumers?** The orchestrator, before it dispatches any of them. When a worker declares an **Interface deviation** and the PR merges, the producer ticket's Produces line and every consumer ticket's Consumes line are rewritten to the shipped signature, and the change is recorded under `Deviated:` in the epic's plan comment (`sync-progress plan --add-deviation`), so the main gate knows it was accepted. No consumer is running yet, because every Consumes line is blocked by its producer.

**A worker says the design is unsettled. What happens mid-epic?** A `NEEDS_CONTEXT` report names its kind. A missing fact, such as an env var name, is supplied and the worker resumes, with no edit to the epic. An unsettled design means the epic leaves more than one valid approach open, or its decision contradicts the code, so the worker stays stopped while the orchestrator settles it with you. It grills you on the question with [grilling](../productivity/grilling.md), supplying the facts from the code and the epic, and records an ADR with [domain-modeling](../engineering/domain-modeling.md) if the decision is hard to reverse. It then writes the decision into the epic as one `## Spec deltas` item (MODIFIED or ADDED, or REMOVED if you drop the behaviour), creating the section if the epic has none, and rewrites the stopped ticket and every ticket whose Consumes or Produces line the decision changes. A dropped behaviour closes its ticket as not planned instead. It adds one line under `Deviated:` in the plan comment and resumes the worker on the rewritten ticket. The record lives in two places: the epic's Spec deltas, which [close-epic](../engineering/close-epic.md) already checks shipped, and the plan comment. Nothing else marks the epic or the tickets as amended.

**My workers branched from `main`, not the integration branch.** A harness worktree can start on the default branch whatever your own checkout is on. The brief's first step fetches the integration branch, cuts `sdd/<N>-<slug>` from `origin/<integration branch>` and checks the merge base before any code is written, so the worker lands on the right base by following the brief alone.

**A re-review went to a fresh reviewer that redid the whole review.** A PR's worker and reviewer worktrees now stay until that PR merges or goes to `ready-for-human`, so a sibling's merge no longer removes the reviewer you need to resume. When a reviewer cannot be resumed anyway, the fresh one gets the earlier findings by id and the head SHA they were reviewed at, and runs only the scoped re-review.

**Can I use Agent Teams instead of worktree waves?** Not in the same session. Teammates get no worktree isolation and cost several times the tokens; the skill stops if the Agent Teams flag is set.

## It's working if

- Each worker's PR touches only its ticket's Files owned, and says `Closes #N`.
- Each sub-issue is closed right after its PR merges into the integration branch, with a comment naming the PR, and the next wave's tickets unblock from that.
- The epic carries one `<!-- sdd-wave -->` comment that updates in place and holds every wave (its tickets, workers, `Edges added:` line and PRs) and every panel round, all written through `sync-progress`.
- Nothing is merged to `main` by the agent, and every slice PR has a review comment with separate Spec and Quality verdicts.
- A worker that could not finish shows up as `ready-for-human` with its PR left open and the reason on its progress comment (a hand-back), not as a silent stop.

## Where it fits

`build-epic` is the **build step** of the SDD chain: [grill-with-docs](../engineering/grill-with-docs.md) → [to-spec](../engineering/to-spec.md) → [to-tickets](../engineering/to-tickets.md) → `build-epic` → [review-panel](../engineering/review-panel.md) → [close-epic](../engineering/close-epic.md). For which skill to reach for next, [ask-syn54x](../engineering/ask-syn54x.md) routes the whole set.
