## What it does

`review` reads one pull request with a reviewer that took no part in writing it, and returns two verdicts: **spec** (did the change deliver what its Sub-issue or One-off asked for, and the Epic above it) and **quality** (is it correct, are its modules deep, does it keep the repo's Laws). It records them on the pull request and posts one review comment. It never edits the code and never approves on GitHub; whoever started it decides what happens next.

It trusts nothing it did not see run. The author's green tests, the pull request body and its claims are all checked again on the exact head the review read: the reviewer runs the linked issue's Verify block itself through `spp verify`, reads CI with `spp checks`, and holds each line of the body against the branch. `spp verify` runs the block only while it matches what harden pinned, so an edit to the issue after hardening stops the review instead of running unapproved commands. A verdict counts only for that head, so a push during the review sends it back to the start.

## When to reach for it

Type `/review 57`, or the agent starts it when a task fits: a slice pull request waiting for its gate, a request to review a pull request, a fix round that needs checking, or an Epic's pull request that needs its spec verdict. On the Epic path, `build` calls it as the slice gate for every Sub-issue, so most of its runs happen there.

| Your situation | Use |
| --- | --- |
| One pull request, a slice or a one-off change | `review` |
| The Epic's pull request to main, when the Epic is large | `review-panel`, which runs several reviewers with fixed focuses and merges what they find |
| The shape of the code across the repo, not one pull request | `improve-architecture` |

`ask-spp` routes between every skill when the right one is unclear.

## Two verdicts, kept apart

A pull request can do exactly what was asked and still be code nobody should keep, or be clean code that builds the wrong thing. Keeping the verdicts separate means a strong result on one cannot hide a failure on the other.

| Verdict | Judged against | Typical finding |
| --- | --- | --- |
| Spec | The Sub-issue's or One-off's acceptance criteria, Test scenarios, Files owned and Interfaces, and the Epic's decisions when there is an Epic | A scenario with no test; a function renamed from what a sibling Sub-issue imports |
| Quality | Correctness, the Depth check from [codebase-design](codebase-design.md), and the documents on the repo's Laws line | A swallowed error on a write path; a new module that makes its callers learn as much as it does |

Each finding is one line with a severity (Critical, Important or Minor), the file and line, and a **Law tag** naming the rule it enforces, such as `[ticket#Interfaces]` or `[CLAUDE.md#Prose]`. A finding needs at least 80% confidence and a concrete failure behind it; a hunch stays out. Any Critical or Important finding fails its verdict.

## Common questions

**The review says "quality verdict only". Why?**
**What about a fix pull request?**
A fix has no closing line. It opens `Refs #N` for a Sub-issue and targets that Sub-issue's Epic's integration branch. The review treats it as a slice: it runs the Sub-issue's Verify block, gives both verdicts, judges spec against the findings the body names and the Sub-issue's acceptance criteria, and records the verdict against that Sub-issue so `build` can merge it.

**What if there is no closing line and no `Refs`?**
The pull request body has no `Closes #N` line, or the issue it closes is a raw issue that never got the Ticket contract, so there is no Sub-issue or One-off to judge the spec against. The review still checks correctness, depth and Laws. It records no gate verdict, so `build` will not merge such a pull request until the line is added and the review runs again.

**The review stopped and said the issue needs harden again. Why?**
The linked issue was hardened, but its Verify block is no longer pinned or has changed since, so `spp kind` reads it as `raw` with a `pin-present` or `pin-match` rule. Anyone who can edit the issue can rewrite those commands, so the review runs none of them and posts no verdict. Run [harden](harden.md) on the issue to check and pin the block again, then run the review again.

**Every test passed on the branch. Why did Verify fail in review?**
When the base branch has moved since the branch was cut, the reviewer merges the newer base into a local copy and runs Verify there as well. Two slices can each pass alone and fail together; this is where that shows up, before the merge rather than after it.

**Why does every finding need a Law tag?**
The retro counts fix-round findings by tag to name which rule workers keep missing. An untagged finding counts as nothing, so the review refuses to post until each finding names its rule, or says `[none]` after checking that no written rule covers it.

**Why does a slice review raise findings in the depth category?**
Shallow modules are cheapest to fix while the author still has the files open. The four Depth check questions run on every module the pull request adds or reshapes, and each one that fires is an ordinary finding at the severity the check gives.

**ponytail is installed. What does it change?**
When the slice changes code, the reviewer also runs `ponytail-review` on the same head, after its own findings are written down. It checks each of ponytail's findings, keeps only those that hold up, and posts them in a separate `## Ponytail` comment, marking each one that repeats a finding of its own so the retro can count the overlap. A kept Critical or Important one that the reviewer did not already have joins the fix round. Ponytail's own verdict is never read. Without ponytail, nothing changes.

**What happens after a fix round?**
The next review is scoped: it reads only the commits since the head it last reviewed, marks each earlier finding addressed or not, and looks for anything the fix broke. Verify and CI run again on the new head.

## It's working if

- The head named in each verdict on the pull request is the one GitHub shows.
- The review comment's Verify line names a commit the reviewer ran, not one the author reported.
- Each finding points at a file and line and names its rule.
- A pull request with no `Closes #N` line gets a quality verdict and a sentence saying why there is no spec verdict.
- Ponytail findings, when present, sit in their own comment and each one was checked before it reached the fix round.
