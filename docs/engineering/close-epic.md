## What it does

`close-epic` closes an SDD epic once every sub-issue is closed and its PR to `main` has merged. It posts one summary comment with the ticket-to-PR table, computes a **retro** from GitHub state alone (tickets by size, escalations, blocking edges added mid-build, fix rounds and the **Law** each fix-round finding cited, Verify blocks that had to be corrected, panel findings), tags each learning as `[repo]`, `[reusable]` or `[skill]`, and closes the epic.

With your consent, and only then, a `[skill]` learning can become a `skill-feedback` issue on `syn54x/skills-plus-plus` so the skills themselves improve. Those issues are built from the allowlist of the feedback profile you chose, previewed one by one, checked by a guard script, and never filed from a non-interactive run.

## When to reach for it

Type `/close-epic <epic#>`, or the agent reaches for it when an epic is ready to wrap up. [build-epic](../engineering/build-epic.md) calls it once you have merged the PR to `main`; it works from GitHub state alone, so it can run in any later session too. `--dry-run` computes everything and posts nothing.

## Prerequisites

Every sub-issue closed and the integration-branch PR merged to `main`, in every repo of a multi-repo epic. If either is not true it stops, and the default answer to "close anyway?" is no.

The epic itself may already be closed. The integration PR says `Closes #<epic>`, so your merge usually closes it first; what the skill keys on is whether the `<!-- sdd-summary -->` comment exists, not the epic's state. With no summary it runs every step and skips only the final close; with one it stops, because it has already run.

Upstream feedback is off unless the repo's routing block names a profile other than `off`, which [setup-syn54x-skills](../engineering/setup-syn54x-skills.md) asks about. An older block that says `on` is read as `counts`.

## Common questions

**The epic was already closed when I ran it. Is the retro lost?** No. A closed epic with no summary comment is the normal starting state, since the PR to `main` closes the epic on merge. The skill posts the retro and summary as usual and leaves the close alone.

**Older retros showed 0 fix rounds and an empty panel. Were they right?** Usually not. They found ticket PRs through GitHub's closed-by links, which fill in only when a PR merges into the default branch, and slice PRs merge into the integration branch; they also read the panel only from PR reviews, while the panel posts a comment. The retro now finds each ticket's PR by its base branch and `Closes #N` line, reads the panel from comments and reviews, counts each re-review round (`panel (2 rounds)`), and says **not found** for a measure it has no input for, so a missing input never passes for a zero.

**When does the retro say a ticket was claimed?** At the claim mark: claim time starts at the first `claimed` label event on the ticket, and the retro measures from there to the ticket's earliest PR. Epics built before the mark have no such event, so the retro falls back to the first assignment. The measure and the retro's schema are unchanged.

**What does "by cause" in the retro mean?** Every finding in a failed `review-pr` verdict on a ticket PR carries a **Law tag** naming the rule it enforced, and the retro counts those findings by tag source. A repo file keeps its name (`AGENTS.md 2`), a ticket section keeps its section (`ticket#Interfaces 1`), and `epic`, `cited`, `skill` and `none` each count as one. The skill then checks each source against your **Laws line**:

| The finding cited | It counts toward | Which points at |
| --- | --- | --- |
| a file on the Laws line or the fallback list, or the epic, ticket, a cited document or an SDD skill rule | `law-read-not-checked` | the worker had the rule and did not check its diff against it |
| a repo file on neither list | `law-not-in-read-list` | the Laws line is missing that file; add it with [setup-syn54x-skills](../engineering/setup-syn54x-skills.md) |
| no Law at all (`none`) | neither | plain logic or test gaps: the review tier or its calibration |

Those two counts are the evidence behind a `[skill]` learning. A feedback issue carries them as totals by family (`repo`, `epic`, `ticket`, `cited`, `skill`, `none`) and never the file names. Retros posted before this change (`sdd-retro/2`) have no by-cause count.

**What leaves my repo?** Nothing, unless a profile other than `off` is set and you approve each issue. The retro comment stays on your epic either way. The profile decides what an issue may carry:

| Profile | A feedback issue carries |
| --- | --- |
| `counts` | the skill and step, a category from a closed list, the retro counts, the harness and `gh` versions, and one sentence you type; never a repo name, URL, title, path or code |
| `detailed` | the same, with a few sentences on what the skill said, what the agent did, and what you fixed by hand |
| `attributed` | `detailed`, plus your repo's name and links to the epic, its tickets and PRs; never another repo's name or link, a path, code, a title or error text |

On a private repo under `attributed`, the confirmation says that the repo name and those links become public.

## It's working if

- The epic has one `<!-- sdd-summary -->` and one `<!-- sdd-retro -->` comment, and every `[skill]` learning has a number behind it.
- The retro's fix-rounds row lists the findings by cause whenever it lists a fix-round count, and says **not found** for the causes only when the fix rounds are not found either.
- It refused to run while a sub-issue or the PR to `main` was still open, and running it twice on the same epic posted nothing new.
- No feedback issue appeared without you seeing its full body first.

## Where it fits

`close-epic` is the **last step** of the SDD chain, after [review-panel](../engineering/review-panel.md) and your merge to `main`. [ask-syn54x](../engineering/ask-syn54x.md) routes the whole set.
