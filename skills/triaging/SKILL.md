---
name: triaging
description: Move one filed issue to a triage role. Use when told to triage a specific issue number.
metadata:
  credits:
    - skill: triage
      author: Matt Pocock
      url: "https://github.com/mattpocock/skills/tree/main/skills/engineering/triage"
---

Triage is step one of the single-issue path. You were given one issue number, by `/triage` or by a prompt such as "use triaging for #N": a filed bug or enhancement goes in and comes out holding exactly one **Triage role**. An issue that leaves as `ready-for-agent` carries the **Ticket contract** and one size, so it is a **One-off** that `/build` takes directly.

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

An issue leaves with one of these and never two. If it arrives holding two, ask the person which stands before anything else (see *Waiting on the person*). When `gh label list` lacks them, ask the person to run `/setup-spp` and stop. Whether the issue is a bug or an enhancement is your judgement and sets what step 2 does; no label records it.

## Waiting on the person

Every turn that ends waiting on the person opens with one line, before anything else: `#<N> waits on you: <question>`, where N is the issue you are triaging. An issue holding two roles, each round of the clarity interview in step 2, and the word step 3 waits for all ask this way (`#42 waits on you: confirm ready-for-agent?`), and so does any other question. The detail (the evidence, the outcome, the reason) follows the line. When you run in a sub-session, the session that started you may see only the opening of your message, so a question placed anywhere else never reaches the person there. A short answer (yes, a role name) may come relayed from that session, quoted as the person's, and it is the person's word; an interview round is answered here, in this session.

The reporter's side is unchanged: `needs-info` asks the reporter on the issue itself, and their reply brings the issue back to triage.

## 1. Read

```bash
gh issue view <N> --comments --json number,title,body,labels,comments,createdAt
spp kind <N>
```

Read the body and every comment. A comment that opens with the disclaimer is an earlier triage note: keep what it established and do not re-ask what the reporter has since answered. If `spp kind` prints `epic`, the issue is already a spec with Sub-issues; say that `/build <N>` takes it, and stop. If it prints `sub-issue`, the issue is already a hardened slice of the Epic its reason names; say that `/build` on that Epic takes it, and stop.

## 2. Put four questions to the issue

Read `GLOSSARY.md` and the ADRs for the area first, then answer each question from evidence.

| Question | How to answer it |
| --- | --- |
| Is it already built? | Take the term `GLOSSARY.md` gives the behaviour, search the code for it and for what the behaviour does, and name the file or command that does it. If nothing does, list the searches that came up empty. |
| Was it refused before? | Read every file in `.out-of-scope/` and the repo's `SCOPE.md` where they exist, and `gh issue list --state all --search "<concept>"` for the same ask. Match on the idea: a request to support Linear matches a record about trackers other than GitHub. |
| Is it true? | A bug is reproduced from the report's steps on the default branch (where `/build` will cut a One-off from) and then written as one command that exits non-zero while the bug lives and zero once it is fixed. An enhancement is checked for the behaviour the code lacks and the place it would go. |
| Is it clear? | One sentence states the wanted behaviour, and no choice is left open. When it is not clear, call the Skill tool twice, for "grilling" and "domain-modeling", and ask one round at a time. |

For the sample report, the reproduction is recorded like this:

```
$ notes add "it's late"
SyntaxError: Unterminated string in JSON at position 11
$ echo $?
1
```

The Verify line is the bare command, `notes add "it's late"`: its own exit code is 1 while the bug lives and 0 once it is fixed, so it opens the Verify block unchanged and starts red. A bug counts as confirmed only with the command and its output in hand; a report that will not reproduce, or is too thin to try, is `needs-info`.

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

Tell the person the outcome and why, with a short account of the code involved, and wait for their word, opening with the waiting line.

A role the person names up front is theirs to set, and they may skip this wait and the interview in step 2. The evidence under a role is not theirs to waive: for `ready-for-agent` the reproduction, the harden call and the lint run whoever asked. State the changes you are about to make, then make them.

## 4. Apply it

Swap the roles in one `gh issue edit`, then post one comment that opens with the disclaimer.

### `ready-for-agent`

1. Call the Skill tool with "harden", passing the issue number, what you found, and for a bug the reproduction command, named as this issue's expected-red reproduction: it fails on the base branch because it is the bug, and it belongs first in the Verify block. harden writes the contract and sets one size.
2. Read the body's `## Verify` again (`gh issue view <N> --json body`). For a bug, confirm the reproduction command is in it. If harden dropped or rewrote it, put it back as the first line, read every other Verify line and keep only commands harden or you chose, then write the body to a file of your own, apply it with `gh issue edit <N> --body-file <file>`, and pin it with `spp lint ticket <N> --pin <file> --by "triaging re-pin"`, which records the pin as triaging's, so a Signal against that block is charged to triaging and not to harden. A ready bug with no reproducing command has nothing to turn green, and your edit changed the block harden pinned, so only your file's block can be pinned in its place.
3. Run `spp lint ticket <N>`, with no `--pin`, and add `ready-for-agent` only after it prints `ok` on the body as it now stands. When step 2 wrote nothing, harden's pin stands: the block was written from harden's file, and pinning the body as fetched now would approve whatever anyone edited into it since. `spp verify` refuses a block that differs from its pin. If harden ended in `needs-info`, that is the outcome. Harden's **Still open** comment carries no disclaimer, so post a short comment of your own that opens with it, points at that list, and asks the reporter to answer its points; it takes the place of step 4.
4. Comment with the role, the size, what was established and, for a bug, the failing output.

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

Comment with one sentence of findings, so no later reader repeats your checks, and then a table with a row per question: what the reporter is asked, and what the answer decides. A question that decides nothing is not asked, and each one should be answerable in a line.

```markdown
> *Posted by an AI during triage.*

Not ready to build yet. Found so far: the crash needs a quote in the text; plain text saves.

| Question for @reporter | What the answer decides |
| --- | --- |
| Which shell runs the command? | `fish` and `bash` pass a quote differently, so it shows whether the fault is in `notes` or in the call. |
```

### `wontfix`

- Already built: comment with where it lives, then close.
- Rejected: read [`OUT-OF-SCOPE.md`](OUT-OF-SCOPE.md) to write or extend the record, and show it to the person. Comment with the reason and the record's path, apply the role, and close as not planned:

  ```bash
  gh issue close <N> --reason "not planned"
  ```

### `needs-triage`

Apply the role, and comment only when there is partial progress to keep.

### Escaped defects

For a reproduced bug that leaves as `ready-for-agent`, `ready-for-human` or the Epic path, once the role is applied read [`ESCAPED-DEFECT.md`](ESCAPED-DEFECT.md) and follow it.

## Done when

- The issue holds one role, and a comment opening with the disclaimer says why.
- For `ready-for-agent`: `spp lint ticket <N>` printed `ok`, the Verify block carries a pin from harden's file or from yours, exactly one size label is set, and for a bug the reproduction was seen failing and then found in the body's `## Verify`, first, before the role went on.
- For a rejection: the record sits in the repo's working tree and the issue is closed as not planned.
- For a reproduced bug that left as `ready-for-agent`, `ready-for-human` or the Epic path: the escaped-defect trace was run, and the person was told what `spp signal` printed or that nothing gated the lines.
