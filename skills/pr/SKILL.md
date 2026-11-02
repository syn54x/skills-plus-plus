---
name: pr
description: The pull request body, from the summary visual to the sections a review gate checks. Use when writing or rewriting a pull request description, including a worker opening the pull request for a Sub-issue or One-off and a fix round that changes what the body claims.
---

A pull request body is read by someone deciding whether to merge. Give them, in this order, what changed, proof that it works, and what breaks if it is wrong. When the pull request builds an issue that carries the **Ticket contract**, the body is also a set of claims the review gate checks one by one against the diff, so those sections are required and have no default text.

Call the Skill tool with "writing-for-humans" before drafting the prose, and use the `GLOSSARY.md` term for anything it defines. Leave out preamble and anything the diff already shows.

## The body

```markdown
Closes #<N>

## Summary

<one or two sentences: the behaviour this makes work>

<the smallest visual that shows it>

## Evidence

**Before:** <the failing run, the old output, the old screen>
**After:** <the passing run, the new output, the new screen>

## Merge danger

**Door:** one-way | two-way: <why>
**Blast radius:** <what is affected if this is wrong>

## Verify

Ran the Verify block on `<sha7>`: passed.
TDD: red `<command>` (<what failed>); green `<command>` (<passed>/<total>).
Verify block corrected: no

## Ticket

- AC1: <test or file:line>
- Scenario, <category> <case>: <test or file:line>

## Interfaces

Interfaces changed: none

## Laws

- <source>#<rule>: <how the diff meets it>
- <source>: n/a: <reason>

## Notes for the reviewer

<decisions the issue left open, `No RED:` pins, anything the reviewer should look at first; or "none">
```

A pull request that builds no issue keeps Summary, Evidence and Merge danger and drops the rest. When the repo has its own pull request template, keep its headings and put these sections after them; `Closes #<N>` still opens the body.

## Summary

Find the one point the reviewer must hold, then the smallest picture that carries it. Prefer the plain-text forms, since they read the same in a terminal, an email and the web.

| The point is | Show |
| --- | --- |
| a rule or an algorithm | a few lines of pseudocode |
| who calls whom at run time | an indented call tree |
| where responsibility lives in the files | a shallow file tree, one comment per line |
| how parts talk to each other over time | a Mermaid `sequenceDiagram` |
| a change to a shape that already exists | a `diff` block over that tree or pseudocode, `+` for what arrives and `-` for what leaves |
| a new block most readers will copy | the whole block |

A `diff` over a call tree makes the change stand out where a paragraph would bury it:

```diff
 openPullRequest
   writeBody
+    readIssueFromClosesLine
   push
```

Keep only the names the reviewer needs for the point being made. One visual is usual; two is the most that helps. A change too small for any picture gets the sentence alone.

## Evidence

Prove the change with the old result beside the new one. For a visual change nothing beats a screenshot, if the environment can capture it. Without one, show a run: the named test that was red before and is green now, with the command and the lines of output that matter. A change with no runnable effect (a docs page, a skill file) shows the check that now passes, such as the build or the lint.

## Merge danger

A **two-way door** can be walked back: revert the merge and nothing is lost. A **one-way door** is not: a data migration, a deleted record, a published package version, a renamed public route that clients already call. Say which, and why.

The **blast radius** is everything this can break if it is wrong: callers of a changed signature, other services reading the same data, layouts on narrow screens, users mid-session. Name the widest one honestly; a reviewer trusts a stated risk more than a missing one.

## The gate's sections

These apply when the pull request closes an issue with the Ticket contract. A missing section or line is a finding on its own, because an absent claim cannot be checked.

- **`Closes #<N>` on the first line.** GitHub does not link closing keywords on a pull request into a non-default branch, so the gate, `spp` and the orchestrator read the issue number from this line.
- **Verify.** The short SHA Verify ran on, which equals the pushed head. The TDD line names the red command with what failed and the green command with its count; for a prose issue the red command is the Verify run before the first edit. `Verify block corrected:` is always present: `no`, or `yes:` with what was wrong in the issue's block and the command run instead.
- **Ticket.** The acceptance criteria and then the Test scenarios, in the issue's order, one line each, closed by the test (`file::name`) or hunk (`file:line`) that meets it. No line here may read `n/a`.
- **Interfaces.** `Interfaces changed: none` when each exported name the diff touches pairs with a Produces line. Otherwise each **Interface deviation** gets its own `Interfaces changed:` line, giving the signature the issue asked for, the signature shipped, and the reason the first was unworkable.
- **Laws.** Grouped by source (a repo document by rule id or heading, the Epic by decision name, a document the issue cites by its binding heading), a line for each Law the diff engages with how it complies. A source where none applies gets a single `n/a: <reason>`.
- **Outside Files owned.** Only when a file outside Files owned changed: each path with its reason.

## Keeping it true

The body describes the head it was written for. When a fix round pushes new commits, rewrite the sections whose claims moved (the Verify SHA, the Ticket lines, the Laws lines) before asking for another review.

## Done when

- A reviewer can say what changed and how risky it is from the Summary and Merge danger alone.
- Evidence shows a before and an after.
- For a pull request that closes an issue, every section above is present and each claim points at something in the diff.
