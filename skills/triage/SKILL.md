---
name: triage
description: Move a filed bug or enhancement to one triage role, hardened and sized when it is ready to build.
disable-model-invocation: true
---

Triage is step one of the single-issue path. A filed bug or enhancement goes in and comes out holding exactly one **Triage role**. An issue that leaves as `ready-for-agent` carries the **Ticket contract** and one size, so it is a **One-off** that `/build` takes directly.

The examples follow one report: "`notes add` crashes when the text contains a quote".

Every comment triage posts, and every issue it files, opens with this line, so a reader can tell a maintainer did not write it:

```
> *Posted by an AI during triage.*
```

## The roles

| Role | Means |
| --- | --- |
| `needs-triage` | Not yet evaluated |
| `needs-info` | Waiting on the reporter |
| `ready-for-agent` | A worker can build it with no person involved |
| `ready-for-human` | A person has to decide or build it |
| `wontfix` | Will not be actioned |

An issue leaves with one of these and never two. If it arrives holding two, ask the person which stands before anything else. When `gh label list` lacks them, ask the person to run `/setup-spp` and stop. Whether the issue is a bug or an enhancement is your judgement and sets what step 2 does; no label records it.

## 1. Pick and read

With no issue named, list the open issues that have no role, hold `needs-triage`, or hold `needs-info` and have a reply since the last triage comment. Show the oldest first, with a count and one line each, and wait for the person to choose.

```bash
gh issue view <N> --comments --json number,title,body,labels,comments,createdAt
spp kind <N>
```

Read the body and every comment. A comment that opens with the disclaimer is an earlier triage note: keep what it established and do not re-ask what the reporter has since answered. If `spp kind` prints `epic`, the issue is already a spec with Sub-issues; say that `/build <N>` takes it, and stop.

## 2. Put four questions to the issue

Read `GLOSSARY.md` and the ADRs for the area first, then answer each question from evidence.

| Question | How to answer it |
| --- | --- |
| Is it already built? | Search the code for the behaviour under its domain name, not the reporter's wording, and say where you looked. |
| Was it refused before? | Read every file in `.out-of-scope/` and the repo's `SCOPE.md` where they exist, and `gh issue list --state all --search "<concept>"` for the same ask. Match on the idea: a request to support Linear matches a record about trackers other than GitHub. |
| Is it true? | A bug is reproduced from the report's steps on the default branch (where `/build` will cut a One-off from) and then written as one command that exits non-zero while the bug lives and zero once it is fixed. An enhancement is checked for the behaviour the code lacks and the place it would go. |
| Is it clear? | One sentence states the wanted behaviour, and no choice is left open. When it is not clear, call the Skill tool twice, for "grilling" and "domain-modeling", and ask one round at a time. |

For the sample report, the reproduction is recorded like this:

```
$ notes add "it's late"; echo "exit $?"
SyntaxError: Unterminated string in JSON at position 11
exit 1
```

The command exits 1 while the bug lives and 0 once it is fixed, so it can open the Verify block unchanged. A bug counts as confirmed only with the command and its output in hand; a report that will not reproduce, or is too thin to try, is `needs-info`.

Done when each question has an answer you can point at.

## 3. Choose, and say so

| What you found | Outcome |
| --- | --- |
| The code already does it | `wontfix`, no record |
| The person confirms an earlier refusal applies, or rejects it now | `wontfix`, with a record |
| Will not reproduce, too thin, or a question only the reporter can answer | `needs-info` |
| Split into behaviours that could each be shown alone, or needs a design choice across modules that nobody made | The Epic path |
| True and clear, but a judgement call, a secret or manual testing is involved | `ready-for-human` |
| True, clear and buildable as one pull request | `ready-for-agent` |
| You stopped before judging it | `needs-triage` |

Tell the person the outcome and why, with a short account of the code involved, and wait for their word. If they have already said "move it to `ready-for-agent`", name what you are about to change and go on; their word waives the waiting and the grilling in step 2, and the reproduction and the lint still run, because neither depends on opinion.

## 4. Apply it

Swap the roles in one `gh issue edit`, then post one comment that opens with the disclaimer.

### `ready-for-agent`

1. Call the Skill tool with "harden", passing the issue number, what you found, and for a bug the reproduction command, noting that it is expected to fail on the base branch because it is the bug. harden writes the contract, puts the reproduction first in the Verify block, and sets one size.
2. Run `spp lint ticket <N>` and add `ready-for-agent` only after it prints `ok` on the body as it now stands. If harden ended in `needs-info`, that is the outcome, with harden's **Still open** comment.
3. Comment with the role, the size, what was established and, for a bug, the failing output.

```markdown
> *Posted by an AI during triage.*

**Triage:** `ready-for-agent`, `size:S`.
**Established:** `notes add` builds its JSON by joining strings (`src/add.ts`), so a quote ends the string early.
**Reproduction:** `notes add "it's late"` exits 1 on `main`; it is the first line of the Verify block.
Build it with `/build 42`.
```

### The Epic path

Apply `ready-for-human`, leave the body alone, and comment that the work is larger than one pull request: run `/grill`, then `/to-spec`, and this issue's text is a fair opening input. harden does not run.

### `ready-for-human`

Comment with what you established, what keeps a worker from taking it, and the decision the person has to make. harden does not run.

### `needs-info`

Comment with two lists. Under "Settled", everything the issue and your checks have fixed, so none of it is lost. Under "Needed", questions the reporter can answer in a line, each naming the fact that would settle the matter.

```markdown
> *Posted by an AI during triage.*

**Settled:** the crash needs a quote in the text; plain text saves.
**Needed from @reporter:** which shell are you in? `fish` and `bash` pass the quote differently, and the answer tells us whether the bug is in `notes` or in the call.
```

### `wontfix`

- Already built: comment with where it lives, then close.
- Rejected: read [`OUT-OF-SCOPE.md`](OUT-OF-SCOPE.md) to write or extend the record, and show it to the person. Comment with the reason and the record's path, apply the role, and close as not planned:

  ```bash
  gh issue close <N> --reason "not planned"
  ```

### `needs-triage`

Apply the role, and comment only when there is partial progress to keep.

## Done when

- The issue holds one role, and a comment opening with the disclaimer says why.
- For `ready-for-agent`: `spp lint ticket <N>` printed `ok`, exactly one size label is set, and for a bug the reproduction was seen failing before the role went on.
- For a rejection: the record sits in the repo's working tree and the issue is closed as not planned.
