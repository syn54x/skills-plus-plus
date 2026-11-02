## What it does

`pr` writes the body of a pull request around the three questions a reviewer brings: what is this, how bad is it if it is wrong, and why should I believe it works. The risk comes before the proof, because how far a change can reach decides how much proof it needs.

When the pull request closes a Sub-issue or One-off, the body also carries the sections spp's review gate checks: the Verify run, one line per acceptance criterion and Test scenario, the interfaces changed, and the Laws the diff touches. Each of those lines is a claim the gate holds against the diff, so the body is evidence to check, not a description to trust.

## When to reach for it

Type `/pr`, or the agent starts it when a task fits: writing or rewriting a pull request description. [implement-issue](implement-issue.md) calls it for every pull request a worker opens, and again when a fix round changes what the body claims.

`ask-spp` routes between every skill when the right one is unclear.

## The body

A short example, for a change that gives each worker a body file of its own:

````markdown
Closes #192

## Summary

The worker writes its body to a file of its own, so siblings never overwrite it.

```diff
 openPullRequest
-  writeBody /tmp/pr.md
+  writeBody $(mktemp "${TMPDIR:-/tmp}/pr-192.XXXXXX")
   gh pr create
```

## Merge danger

**Door:** two-way: reverting the skill change puts workers back on the shared path.
**Blast radius:** the first to notice is any Wave with two workers; it reaches every worker in every Wave.

## Evidence

**Before:** two workers in one Wave opened pull requests with the same body.
**After:** each pull request carries the body written for its own issue.
````

The sections the gate checks (Verify, Ticket, Interfaces, Laws) follow these when the pull request closes an issue.

| Section | Holds |
| --- | --- |
| Summary | the claim in a sentence, plus at most two text pictures of what a reviewer would sketch to check it |
| Merge danger | whether reverting the merge undoes it (a two-way door) or leaves something behind (a one-way door), and who notices first if it is wrong |
| Evidence | both states, before and after, with proof as strong as the door demands: a dry run for a one-way door, a test run for most two-way ones |

## Common questions

**Nothing in my change is visible. What counts as evidence?**
A run. Name the test that failed before the change and passes after it, with the command and the relevant lines of its output. For a docs or skill change, show the check that now passes.

**Why does Merge danger come before Evidence?**
Because the risk sets the bar for the proof. A change that a revert undoes can rest on a test run; a dropped column or a published release needs something closer to the real thing first.

**Can I trust the agent's call on one-way versus two-way?**
Read it as a claim. The body has to say why, so a wrong call is visible: a data migration or a published version labelled two-way stands out.

**My repo already has a pull request template. Which wins?**
Both. The template's headings stay, and these sections follow them, with `Closes #<N>` still on the first line.

**Does it keep the body current as the pull request changes?**
When a fix round pushes new commits, the worker rewrites the sections whose claims moved, such as the Verify SHA and the Ticket lines, before the next review.

## It's working if

- A reviewer can tell what changed and how risky it is without opening the diff.
- Evidence puts the old behaviour beside the new, shown rather than promised.
- A pull request that closes an issue passes the gate's section check: `Closes #<N>` first, then Verify, Ticket, Interfaces and Laws, each line pointing at something in the diff.
