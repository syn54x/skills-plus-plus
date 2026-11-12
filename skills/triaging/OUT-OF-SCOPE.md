# Out-of-scope records

A record is for a later triager who meets the same request and has not read the earlier thread. It lives in `.out-of-scope/` at the repo root, one file per refused idea, and it has to answer three questions without a search: what was refused, why the refusal still holds, and what would make it stop holding. Read this file at the `wontfix` step of triage.

## What a record holds

Here is `.out-of-scope/auto-merge.md`:

```markdown
# Auto-merging slice pull requests

spp never merges a pull request itself; a person presses merge.

## Why it holds

The slice gate returns a verdict, and a verdict is an opinion from one
fresh reviewer. Merging is the only step in the pipeline that cannot be
undone cheaply, so it stays with the person who answers for the result.

## Revisit when

Reviewers can be shown to catch what CI cannot, over many Epics, with
the retro's fix-round counts as the evidence.

## Asked by

- #64: "Merge a slice when the gate passes"
- #90: "Auto-merge for size:S One-offs"
```

The parts and the question each one answers:

| Part | Answers |
| --- | --- |
| Title and first sentence | What was refused, in terms a request would use |
| Why it holds | The boundary, written so it is still true next year |
| Revisit when | The observable change that would reopen the question |
| Asked by | Which issues have already hit it |

Name the file for the idea in kebab-case (`auto-merge.md`), so a folder listing reads as a list of refusals.

## A reason that lasts

Test a draft reason by imagining the maintainer had a free month. If the answer would change, the reason is a deferral, and a deferral gets no record: leave the issue open, or ask for information. What survives the test is a fact about the project. Most often here it is a design the project picked over the one the request wants; sometimes the request runs into a constraint, and sometimes it simply falls outside what the project is for.

## Reading a record against a new issue

Compare the new issue with the first sentence and with "Revisit when", and propose the outcome those two give. The person decides.

| The new issue | Outcome |
| --- | --- |
| Asks for the refused thing, and the revisit condition has not happened | Add it under "Asked by", comment, close as not planned |
| Asks for the refused thing, and the revisit condition has happened | The record is stale: rewrite or delete it, then triage the issue as new |
| Touches the same area but wants something the first sentence does not refuse | Leave the record, triage the issue as new |

Match on the idea, not the words. Two phrasings of one ask share a record, while two asks that merely sound alike get separate ones.

## Writing one

Write a record when the person rejects a request, or calls a bug working as designed, and no existing record covers it. Look through the folder first, and extend a record before you add a near-duplicate. A request closed because the code already does it gets a comment pointing at the code and no record, since a record there would make later matches report a refusal that never happened.

The file is an ordinary change in the working tree, on the branch the person is standing on. Show it before the issue closes, and commit it only when they say so.
