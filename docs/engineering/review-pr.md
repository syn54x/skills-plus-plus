## What it does

`review-pr` gates one PR that closes an SDD sub-issue. A fresh reviewer, never the worker, re-runs the ticket's **Verify** block on the PR head and returns two verdicts kept apart: **Spec** (does the diff do what the sub-issue says, classed as Missing, Extra or Misunderstood?) and **Quality** (is it code the repo wants, judged against its laws, with a Fowler smell baseline where the repo documents nothing). It posts both as one PR review comment and routes a failure to one fix round, then to `ready-for-human`.

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

## It's working if

- Every slice PR has one review comment with `## Spec: PASS | FAIL`, `## Quality: PASS | FAIL` and a `Verify:` line naming the commit it ran on.
- Every finding names a file and line at a commit and a severity; there are no "consider…" items.
- A re-review verdicts each earlier finding `ADDRESSED` or `NOT ADDRESSED` instead of starting over.

## Where it fits

`review-pr` is the **slice gate** between [implement-issue](../engineering/implement-issue.md) and the merge into the integration branch. Its big sibling is [review-panel](../engineering/review-panel.md), for the one PR to `main`. [ask-syn54x](../engineering/ask-syn54x.md) routes the whole set.
