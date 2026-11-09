## What it does

`close-epic` finishes an Epic after you merge its integration branch. It checks that the work is really done, posts two comments on the Epic (a retro of the numbers and a summary of what shipped and what was learned), confirms the Spec deltas landed, offers you the pending Skill feedback (or files it, if your Submission mode is Auto), and closes the Epic if the merge has not already done so.

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
Only Skill feedback issues on `syn54x/skills-plus-plus`, one per skill step and category, each with a tally comment from you. Two settings decide what they say and who files them. Your repo's Self-improvement mode (the `Self-improvement mode:` line of the Routing block) sets what an issue may contain:

| Self-improvement mode | What an issue may contain |
| --- | --- |
| Off (or no line) | nothing: no Signal is collected and nothing is filed |
| Anonymous | which skill step failed, one category from a fixed set, Signal and run counts per plugin version, and a sentence of yours with no project detail |
| Full Detail | the same, plus your repo's name and the evidence behind each Signal |

Your own Submission mode (`spp feedback submission`) decides who files. Under Review you see each preview whole and answer file, skip or later. Under Auto spp files without asking and the issue says so, except in a private repo, where Auto falls back to Review.

spp builds each body itself and checks it before anything is posted. A token, key or private key blocks it in every mode, and the check prints it as `[REDACTED]`. Under Anonymous six more rules block file paths, code, repo names, titles, URLs and error text; under Full Detail those rules print as warnings and let the body through. It never rewrites a body. Every issue also asks for an eval case that reproduces the defect, to land with the fix.

**What happens in an unattended run?**
Nothing is collected outside an Attended session (CI, a `claude -p` script, a scheduled task), so there is nothing to offer or draft, and nothing is filed.

## It's working if

- One summary comment and one retro comment sit on the Epic, and running the skill again changes neither.
- Every number in the retro is a count or **not found**, and none of them is an unexplained 0.
- Each `[skill]` learning cites a number from the retro.
- Every Spec delta is marked shipped with its pull request, or named as not shipped with a reason.
- Under Submission mode Review, no issue or tally appeared on `syn54x/skills-plus-plus` that you did not say file to.
