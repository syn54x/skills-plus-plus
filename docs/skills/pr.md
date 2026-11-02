## What it does

`pr` writes the body of a pull request: what changed, proof that it works, and how risky the merge is. The summary carries the smallest picture that makes the change clear, often a few lines of pseudocode or a `diff` over a call tree rather than a paragraph.

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
+  writeBody $(mktemp -t pr-192)
   gh pr create
```

## Evidence

**Before:** two workers in one Wave opened pull requests with the same body.
**After:** each pull request carries the body written for its own issue.

## Merge danger

**Door:** two-way: revert the skill change and workers go back to the old path.
**Blast radius:** every worker in every Wave.
````

The sections the gate checks (Verify, Ticket, Interfaces, Laws) follow these when the pull request closes an issue.

| Section | Holds |
| --- | --- |
| Summary | one or two sentences and at most two small visuals |
| Evidence | the old result beside the new one: a screenshot for a visual change, otherwise a named test or command run |
| Merge danger | whether the change can be walked back (a two-way door) or not (a one-way door), and how far a mistake would reach |

## Common questions

**Nothing in my change is visible. What counts as evidence?**
A run. Name the test that failed before the change and passes after it, with the command and the relevant lines of its output. For a docs or skill change, show the check that now passes.

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
