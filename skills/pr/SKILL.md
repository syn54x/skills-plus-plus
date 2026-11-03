---
name: pr
description: Write a pull request body. Use whenever you open a pull request or rewrite its description.
---

The person reading a pull request body has one decision to make, merge or not, and three questions on the way to it: what is this, how bad is it if it is wrong, and why should I believe it works. The body answers them in that order, because the answer to the second sets how much proof the third needs. When the pull request builds an issue that carries the **Ticket contract**, the body goes on to make claims the review gate tests against the diff line by line; those sections are mandatory and have no stock wording.

Call the Skill tool with "writing-for-humans" before drafting the prose, and use the `GLOSSARY.md` term for anything it defines. Every line should tell the reader something the diff does not.

## The body

```markdown
Closes #<N>

## Summary

<the claim, in a sentence or two>

<a text picture of it, when one helps>

## Merge danger

**Door:** one-way | two-way: <what undoing it would take>
**Blast radius:** <who notices first if it is wrong, and how far it spreads>

## Evidence

**Before:** <what the reader would have seen without this change>
**After:** <what they see with it>

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

<decisions the issue left open, `No RED:` pins, where to start reading; or "none">
```

Without an issue behind it, a pull request needs only the first three sections. If the repo ships its own template, its headings come first and these follow, with `Closes #<N>` still on line one.

## Summary

Write the claim as a sentence before anything else: what someone can now do, or what now happens, that was not true yesterday. If that sentence needs an "and", the pull request may be two.

Then ask what a reviewer would sketch to check the claim, and draw that sketch in plain text, which survives terminals, emails and notification previews. Keep it smaller than the diff it stands for, and use only names that appear in the diff.

| To check the claim, the reviewer wants | Draw |
| --- | --- |
| which inputs now give which outputs | a small table of cases |
| where a request or a value travels | one line of arrows: `form -> POST /invoices -> queue -> mailer` |
| which files gained or lost a job | a tree of only the touched paths |
| what several processes say to each other, in order | a Mermaid `sequenceDiagram` |
| how something that already existed changed shape | that shape in a `diff` fence |

A table of cases, for a fee rule:

```text
order total   before   after
  19.99        2.50     2.50
  20.00        2.50     0.00
 120.00        0.00     0.00
```

One picture is the norm and two the ceiling. A typo fix gets the sentence alone.

## Merge danger

Two questions, answered honestly, so the reviewer can set how hard to look.

- **Door.** If this turns out wrong, does reverting the merge undo it? A two-way door reverts cleanly. A one-way door leaves something behind that a revert cannot reach: a column already dropped, an email already sent, a tag already published, a route already called by clients in the field. Say which, and what undoing it would take.
- **Blast radius.** Who notices first if it is wrong, and how far does it reach from there? Name the first person or system to feel it (a test suite, one screen, every caller of a function, every tenant) and the widest it could go.

A stated risk earns more trust than a body that claims none.

## Evidence

Evidence answers "how do you know?", and its strength should match the door: a two-way door may rest on a test run, while a one-way door wants a dry run or output from data shaped like production.

Pick the proof that fits the kind of claim, and show the state before the change beside the state after it, so the reader sees the difference rather than being told about it:

| The claim is about | Show |
| --- | --- |
| what someone sees on screen | a screenshot of each state, if the environment can produce them |
| what the code does | the command and the lines of output that matter: the named test red before, green after |
| a risk that was avoided | the dry run, the plan output or the check that would have caught it |
| a document or skill | the check or build that now passes |

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

- The Summary states the claim in a sentence, and Merge danger names the door and the first to notice.
- Evidence is as strong as the door demands and shows both states.
- For a pull request that closes an issue, every gate section is present and each claim points at something in the diff.
