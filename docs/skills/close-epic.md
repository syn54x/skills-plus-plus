## What it does

`close-epic` finishes an Epic after you merge its integration branch. It checks that the work is really done, posts two comments on the Epic (a retro of the numbers and a summary of what shipped and what was learned), confirms the Spec deltas landed, offers to report skill defects upstream, and closes the Epic if the merge has not already done so.

Its numbers are computed by the `spp` tool from GitHub alone: the gate's verdicts on each Sub-issue's pull request, the Hand-back label events, the panel rounds recorded on the Epic, and ponytail's findings when it ran. Nothing depends on the session that built the Epic, so you can run it days later, on another machine. Where an input is missing, the retro says **not found** rather than 0, because a missing input that reads as zero looks like a clean Epic.

## When to reach for it

You type `/close-epic <epic>`; the agent never starts it on its own. Run it once the pull request from the integration branch has merged. It closes out the Epic path, after building and the panel. `ask-spp` routes between every skill when the right one is unclear.

For a session that built no Epic, use [retro](retro.md) instead. Both write their learnings in one format, so a lesson from a single session and one from an Epic read the same.

## Learnings

The summary's core is its Learnings: one line each, with a tag for where the fix lands, a severity, the evidence, and the change.

| Tag | The fix lands in |
| --- | --- |
| `[repo]` | your repo: `CLAUDE.md`, an ADR, a check, the Laws line |
| `[skill: <name> <step>]` | an spp skill whose step said the wrong thing or nothing |
| `[reusable]` | somewhere beyond this repo, which you choose |

A `[skill]` learning needs a number from the retro behind it. Without one it is a `[repo]` learning, since the skill cannot be shown to have caused it.

## Common questions

**The merge closed my Epic before I ran this. Is it too late?**
No. The pull request from the integration branch says `Closes #<epic>`, so the merge usually closes the Epic first. An Epic that is closed but has no summary is where the skill normally starts; it posts both comments and leaves the close alone. It refuses only when a summary comment already exists, because that means it has run.

**Why does the retro say "not found" instead of 0?**
A zero claims the thing did not happen; "not found" says the record that would show it is missing, such as a Sub-issue with no linked pull request or no panel recorded on the Epic. Ponytail reads "did not run" for the same reason when it was not installed.

**What does "by cause" count?**
Each finding in a failed gate verdict is tagged with the Law it cites, and `spp retro` totals them per tag. The skill then splits those totals in two. Findings citing a Law the worker was given (the Epic, the Sub-issue, a cited document, a skill rule, or a file on your Laws line) mean the worker was given the rule but still broke it. Findings citing a repo file outside the Laws line mean no one told the worker to read it, and the fix is one line in the Routing block.

**What leaves my repo?**
Only issues you approve one by one, and only when your Routing block sets an `Upstream feedback:` profile other than `off`.

| Profile | What an issue may contain |
| --- | --- |
| `counts` | which skill step failed, one category from a fixed set, totals from the retro, tool versions, and a sentence of yours |
| `detailed` | the same, plus a few sentences on how the step failed |
| `attributed` | everything in `detailed`, along with the name of your repo and links to this Epic, its Sub-issues and their pull requests |

No profile lets out file paths, code, titles or error text. Before it files or drafts anything, the skill runs `spp feedback check` on each body, which applies those rules in code and prints one line per hit (rule, rule name, line number) instead of relying on the agent's reading. It refuses everything when the profile is `off`, and it never rewrites a body. Every issue also asks for an eval case that reproduces the defect, to land with the fix.

**What happens in an unattended run?**
It files nothing. Each would-be issue goes into one drafts comment on the Epic, for you to read and file yourself later.

## It's working if

- One summary comment and one retro comment sit on the Epic, and running the skill again changes neither.
- Every number in the retro is a count or **not found**, and none of them is an unexplained 0.
- Each `[skill]` learning cites a number from the retro.
- Every Spec delta is marked shipped with its pull request, or named as not shipped with a reason.
- No issue appeared on `syn54x/skills-plus-plus` that you did not approve in that run.
