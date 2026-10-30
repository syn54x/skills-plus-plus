## What it does

`review-pr` gates one PR that closes an SDD sub-issue. A fresh reviewer, never the worker, re-runs the ticket's **Verify** block on the PR head and returns two verdicts kept apart: **Spec** (does the diff do what the sub-issue says, classed as Missing, Extra or Misunderstood?) and **Quality** (is it code the repo wants, judged against its **Laws**: the documents the routing block's `Laws:` line names, or a fixed fallback list when the repo has none, with a Fowler smell baseline where the repo documents nothing, plus the **depth check**: did the PR add a shallow module, extract pure functions while the bugs stay at the call site, test past an interface, or touch an already-shallow module without deepening it). When the integration branch has moved since the PR branched, it also runs Verify on a local trial merge of the PR into the current branch, never pushed, and Spec passes only if both trees are green. It posts both verdicts as one PR review comment and routes a failure to one fix round, then to `ready-for-human`. A PASS on both verdicts sets no label: the reviewed open PR and the progress status `verify-passed` are the signal to merge, and `ready-for-human` keeps one meaning, a ticket handed back to a person.

It trusts nothing the worker says. The PR body and the worker's report are claims to check against the diff, and a finding is reported only when the reviewer can name the line, the failure, and is at least 80% sure.

## When to reach for it

Type `/review-pr <pr#>`, or the agent reaches for it when a slice PR needs gating. Usually something else starts it: [build-epic](../engineering/build-epic.md) after each worker reports, and [review-panel](../engineering/review-panel.md), which uses its full-epic mode for the spec verdict on the PR to `main`.

| The PR is… | Reach for |
| --- | --- |
| A slice into an integration branch | `review-pr` |
| The integration branch into `main` | [review-panel](../engineering/review-panel.md) |
| Any diff since a fixed point, outside the SDD pipeline | [code-review](../engineering/code-review.md) |

## Common questions

**Why doesn't it approve or request changes?** The merge decision belongs to the orchestrator or a human; the review is a comment with verdicts, never `--approve` or `--request-changes`.

**What is the `[AGENTS.md#I-5]` at the start of every finding?** The **Law tag**: the rule the finding cites, as source and id. The source is a document from the `Laws:` line, an ADR, the epic, a section of the ticket, a document the ticket cites, a rule of the SDD skills themselves (`skill`, as in `[skill#Laws section]`), or `none` for a plain logic or test gap no document or skill rule names. It costs the reviewer nothing extra and lets [close-epic](../engineering/close-epic.md)'s retro count fix rounds by which law keeps getting broken.

**Why is a missing `## Laws` section an Important finding?** It is tagged `[skill#Laws section]`. The worker lists in the PR body each law that applies to its slice, with how the diff meets it or `n/a` and why. The reviewer reads every line as a claim and checks it against the diff, so an `n/a` on a law the diff plainly touches is a finding under that law. With no section at all there is nothing to check, which is the same reason a missing `Verify block corrected:` line fails.

**Where does the spec verdict start?** At the PR body's Ticket section, where the worker names the test or diff hunk behind each acceptance criterion and Test scenario. The reviewer checks each line against the diff: a named test that does not exercise its criterion is a finding tagged `[ticket#Acceptance criteria]` or `[ticket#Test scenarios]`, and a PR body with no Ticket section is an Important finding tagged `[skill#PR body]`, for the same reason as a missing Laws section.

**What happens on the second failure?** Nothing automatic. After the single fix round and a scoped re-review, open findings hand the ticket back `ready-for-human` with the PR left open.

**What happens when a PR fails review and nobody can resume the worker?** There is no fix round: the reviewer hands the ticket back `ready-for-human` with the failing items as the reason, which sets the label, clears the `claimed` mark and leaves the PR open with the review on it. A one-off reviewed on its own is the usual case.

**Quality failed on a module that works. Why?** The depth check fired. A module the PR introduced whose interface is nearly as wide as its implementation, or tests that mock the code under test, is an Important finding when the fix fits the PR's own files, because the slice is the cheap moment to deepen it. The finding names the direction, never a design; the worker chooses the shape. The four questions live in one place, [codebase-design](../engineering/codebase-design.md)'s `DEPTH-CHECK.md`, and [improve-pr-architecture](../engineering/improve-pr-architecture.md) asks the same four when you want to explore one rather than fix it.

**Verify passed on the PR head. Why is Spec a Critical FAIL?** The trial merge went red. Two slices can each be green alone and break together once both land, say a test constant in one meeting a new refusal in the other. When the base has moved, the reviewer merges the PR into the current base locally and runs Verify there too; red only on that tree is a Critical finding naming the base commits it comes from. A textual conflict is reported the same way and never resolved by the reviewer: the fix is the worker rebasing. If the base has not moved, there is one run and no trial merge. `build-epic`'s Verify after each merge stays as the backstop.

**Quality failed on a PR whose Verify passed. Why?** The worker ran something other than the ticket's Verify block and the PR body did not say so: `Verify block corrected: no`, or no such line at all. That is an Important finding, because a silent correction hides a ticket that could not run as written. Saying `yes` with what was wrong is all it takes.

**The ticket asked for less than the epic. Is that a Spec failure?** Only when the ticket doesn't say so. A `Narrows:` line in the ticket (and a matching `Narrowed:` line in the epic's plan comment) records a narrowing the user approved when [to-tickets](../engineering/to-tickets.md) cut the plan, and the reviewer judges that behaviour against the ticket. Without the line, delivering less than the epic is a Missing finding, labelled *ticket-mandated* when the ticket's own criteria asked for less, so the human sees it was the plan and not the worker.

**The worker changed a Produces signature. Is that a failure?** Not if it says so. An `Interfaces changed:` line in the PR body declares an **Interface deviation** on an in-repo signature: the reviewer checks the code matches the new signature and judges whether the ticket's one really could not work. An unneeded deviation is an Important Quality finding, fixed by reverting to the ticket's signature. A signature that differs with no line is Important too, and one on a cross-repo contract or an interface the epic states is never allowed.

## It's working if

- Every slice PR has one review comment with `## Spec: PASS | FAIL`, `## Quality: PASS | FAIL`, a `Verify:` line naming the commit it ran on, and a `Trial merge:` line naming the base commit it merged into, or saying the base had not moved.
- Every finding names a severity, a Law tag such as `[ticket#Interfaces]` or `[none]`, and a file and line at a commit; there are no "consider…" items.
- A `depth` finding points at the line that declares an interface and says what callers must know, which bug the tests miss, or which refactor they would not survive.
- A re-review verdicts each earlier finding `ADDRESSED` or `NOT ADDRESSED` instead of starting over, and only its new findings carry a Law tag.

## Where it fits

`review-pr` is the **slice gate** between [implement-issue](../engineering/implement-issue.md) and the merge into the integration branch. Its big sibling is [review-panel](../engineering/review-panel.md), for the one PR to `main`. [ask-syn54x](../engineering/ask-syn54x.md) routes the whole set.
