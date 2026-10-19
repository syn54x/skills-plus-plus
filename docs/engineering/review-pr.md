## What it does

`review-pr` gates one PR that closes an SDD sub-issue. A fresh reviewer, never the worker, re-runs the ticket's **Verify** block on the PR head and returns two verdicts kept apart: **Spec** (does the diff do what the sub-issue says, classed as Missing, Extra or Misunderstood?) and **Quality** (is it code the repo wants, judged against its laws, with a Fowler smell baseline where the repo documents nothing, plus the **depth check**: did the PR add a shallow module, extract pure functions while the bugs stay at the call site, test past an interface, or touch an already-shallow module without deepening it). It posts both as one PR review comment and routes a failure to one fix round, then to `ready-for-human`.

It trusts nothing the worker says. The PR body and the worker's report are claims to check against the diff, and a finding is reported only when the reviewer can name the line, the failure, and is at least 80% sure.

## When to reach for it

Type `/review-pr <pr#>`, or the agent reaches for it when a slice PR needs gating. Usually something else starts it: [build-epic](../engineering/build-epic.md) after each worker reports, the `sdd-review.yml` cloud workflow on every non-draft `sdd/*` PR, and [review-panel](../engineering/review-panel.md), which uses its full-epic mode for the spec verdict on the PR to `main`.

| The PR is… | Reach for |
| --- | --- |
| A slice into an integration branch | `review-pr` |
| The integration branch into `main` | [review-panel](../engineering/review-panel.md) |
| Any diff since a fixed point, outside the SDD pipeline | [code-review](../engineering/code-review.md) |

## Common questions

**Why doesn't it approve or request changes?** The merge decision belongs to the orchestrator or a human; the review is a comment with verdicts, never `--approve` or `--request-changes`.

**What happens on the second failure?** Nothing automatic. After the single fix round and a scoped re-review, open findings send the ticket to `ready-for-human` with the PR left open.

**Quality failed on a module that works. Why?** The depth check fired. A module the PR introduced whose interface is nearly as wide as its implementation, or tests that mock the code under test, is an Important finding when the fix fits the PR's own files, because the slice is the cheap moment to deepen it. The finding names the direction, never a design; the worker chooses the shape. The four questions live in one place, [codebase-design](../engineering/codebase-design.md)'s `DEPTH-CHECK.md`, and [improve-pr-architecture](../engineering/improve-pr-architecture.md) asks the same four when you want to explore one rather than fix it.

**Quality failed on a PR whose Verify passed. Why?** The worker ran something other than the ticket's Verify block and the PR body did not say so: `Verify block corrected: no`, or no such line at all. That is an Important finding, because a silent correction hides a ticket that could not run as written. Saying `yes` with what was wrong is all it takes.

**The ticket asked for less than the epic. Is that a Spec failure?** Only when the ticket doesn't say so. A `Narrows:` line in the ticket (and a matching `Narrowed:` line in the epic's plan comment) records a narrowing the user approved when [to-tickets](../engineering/to-tickets.md) cut the plan, and the reviewer judges that behaviour against the ticket. Without the line, delivering less than the epic is a Missing finding, labelled *ticket-mandated* when the ticket's own criteria asked for less, so the human sees it was the plan and not the worker.

## It's working if

- Every slice PR has one review comment with `## Spec: PASS | FAIL`, `## Quality: PASS | FAIL` and a `Verify:` line naming the commit it ran on.
- Every finding names a file and line at a commit and a severity; there are no "consider…" items.
- A `depth` finding points at the line that declares an interface and says what callers must know, which bug the tests miss, or which refactor they would not survive.
- A re-review verdicts each earlier finding `ADDRESSED` or `NOT ADDRESSED` instead of starting over.

## Where it fits

`review-pr` is the **slice gate** between [implement-issue](../engineering/implement-issue.md) and the merge into the integration branch. Its big sibling is [review-panel](../engineering/review-panel.md), for the one PR to `main`. [ask-syn54x](../engineering/ask-syn54x.md) routes the whole set.
