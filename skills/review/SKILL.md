---
name: review
description: Review a pull request with a fresh read-only reviewer, giving separate spec and quality verdicts. Use when asked to review a pull request, or to re-review one after a fix.
metadata:
  credits:
    - skill: code-review
      author: Matt Pocock
      url: "https://github.com/mattpocock/skills/tree/main/skills/engineering/code-review"
    - skill: subagent-driven-development
      author: Jesse Vincent
      url: "https://github.com/obra/superpowers/tree/main/skills/subagent-driven-development"
---

A reviewer that never wrote the code reads one pull request and returns two verdicts. **Spec** asks whether the change does what its linked issue (and that issue's Epic, when it has one) asked for. **Quality** asks whether the repo should keep it: is it correct, are its modules deep, does it keep the repo's Laws. Either can fail while the other passes. The reviewer edits nothing and never approves or blocks on GitHub: it records verdicts, and whoever called it decides what happens next.

Input: a pull request number or URL. Use the URL when the pull request lives in another repo than the one you stand in.

## 1. Be the fresh reviewer

The reviewer carries none of the author's conversation. If this session wrote the change or holds the worker's context, start a fresh read-only reviewer with this skill and send it the pull request and nothing else: no criteria or things to check, no account of the fix or of earlier rounds, no setup notes. It finds each itself (earlier rounds through step 2 and `REREVIEW.md`); a concern of yours goes to the person or into the ticket. Return what it returns, and stop. On Claude Code, [`CLAUDE-CODE.md`](CLAUDE-CODE.md) names the agent and the exact request. With no way to start one, review here and open the comment with `Not a fresh review: <why>`.

Done when you are a reviewer that has seen no line of the author's reasoning.

## 2. Pin the head

```bash
PR=88   # or its URL
gh pr view "$PR" --json headRefOid,baseRefName,body,files
gh pr diff "$PR"
```

`HEAD` is `headRefOid` as read now; every check below runs on it and every verdict names it. `BASE` is `baseRefName`. Take the linked issue `N` from a `Closes #N` (or `Fixes`, `Resolves`) line in the body, never from GitHub's closing references, which stay empty on a pull request into a non-default branch. Then sort the run:

| Linked issue | `spp kind N --json` | Run |
| --- | --- | --- |
| `#N` | `raw` with a `rule` | `pin-present` or `pin-match`: a hardened issue whose Verify block lost its pin. Stop as step 3.1 does on a refusal: post no verdict and report to whoever started the review that the issue needs harden again. |
| no closing line to a Sub-issue of its Epic, but `Refs #N` (or `Refs owner/repo#N`, or an issue URL); `N` is read for this row only | `sub-issue`, and `BASE` is that Sub-issue's Epic's integration branch | A fix: both verdicts. Run the Sub-issue's Verify block with `spp verify N`, judge spec against the findings the body names and the Sub-issue's acceptance criteria, and record with `spp verdict --ticket N`. |
| none, or `#N` (any other `Refs` shape is none) | `raw`, no `rule` | Quality only. The comment's first line says `No linked Sub-issue or One-off: quality verdict only.` (naming `#N` as raw when there is one) and no verdict marker is written, so a gate never passes it. |
| `#N` | `epic` | The Epic's own pull request: read [`EPIC.md`](EPIC.md) and follow it in place of steps 4 to 6. |
| `#N` | `sub-issue` | A slice of an Epic: both verdicts. |
| `#N` | `one-off` | A slice with no Epic: both verdicts. |

For a slice or a fix (`sub-issue` or `one-off`), read the linked issue (`gh issue view N --json body,parent`). A Sub-issue has a parent Epic: read its Implementation Decisions and Out of Scope too, and its plan comment's `**Narrowed:**` and `**Deviated:**` lines. A One-off has no Epic, so its own body is the whole spec. Check `HEAD` out detached in a throwaway worktree; that checkout and an unpushed trial merge are the only things you change.

When this skill already reviewed an older head of the pull request and a fix has landed since, read [`REREVIEW.md`](REREVIEW.md) now: it replaces steps 4 to 6.

Done when you hold `HEAD`, the run's kind, and the texts the spec is judged against.

## 3. Run the evidence

1. **Verify.** Run `spp verify N` yourself from the worktree root, never the block's commands by hand. It runs the linked issue's `## Verify` block only while it matches the pin harden wrote, since anyone who can edit the issue can rewrite those commands. When it refuses (the block is unpinned or changed since hardening), run nothing, post no verdict, and report the refusal to whoever started the review: the issue needs harden again. The worker's green is a claim; yours is the evidence. In a quality-only run there is no block, and the `Verify:` line reads `none`.
2. **Trial merge.** When `git log --oneline "$(git merge-base HEAD origin/$BASE)..origin/$BASE"` lists commits, the base moved after the branch was cut. Merge `origin/$BASE` into the detached head (never pushed) and run Verify again. A conflict is a result: list the conflicting files, abort, and leave the resolution to the author.
3. **CI.** `spp checks "$PR" --json`. `fail` is a Critical finding naming each failing run. `pending` is no finding: when nothing Critical or Important is open, wait for it once and read again, otherwise list it under `Checks:` and move on. `none` changes nothing.
4. **Ponytail.** When the friend `ponytail-review` is available and the diff changes code (not only prose, docs or config), read [`PONYTAIL.md`](PONYTAIL.md) now; it runs after step 6.

Done when Verify has a result on `HEAD` (and on the trial merge when one ran) and `spp checks` has a reading.

## 4. Test the body's claims

The pull request body is the author grading their own work. Check each claim against the branch, never the reverse:

- `## Ticket`: each line pairs one acceptance criterion or Test scenario with the test or `file:line` meant to prove it. When that test never touches the behaviour, or the hunk does something else, the pairing is a spec finding. A body without this section earns an Important spec finding, since a claim nobody made cannot be tested.
- `## Laws`: each line is a claim about one Law. A line the diff disproves, or `n/a` written against a Law the diff in fact triggers, is a quality finding under that Law. A body without this section is Important too.
- `Verify block corrected:` must be present. `no` with a Verify run that differs from the issue's block is an Important finding.
- `Interfaces changed:` lines are the declared deviations step 5 judges.

A stated reason ("kept it small on purpose") explains a choice and never lowers a finding's severity.

## 5. Spec verdict

Slices and fixes only. Judge against the linked issue and its Epic when it has one, setting aside how good the code is. Each gap is **Missing** (asked for and absent, or claimed and not done), **Extra** (built without being asked) or **Misunderstood** (the right thing, built the wrong way).

- Each acceptance criterion holds, backed by a test that goes red if the change is reverted.
- Each Test scenario line maps to a test of its own.
- Nothing outside Files owned changed unless the body declares it with a reason that holds.
- Each Produces line ships under exactly its stated name and signature, and each Consumes line is imported under the name its producer published. A mismatch with no `Interfaces changed:` line is Important. A declared deviation is judged against its new signature and may only touch code inside this repo; when it changes a contract between repos, or a signature the Epic itself fixes, it is Critical.
- The Epic's Out of Scope is untouched. A `**Narrowed:**` line is approved scope; anything else the Epic promised that this slice owes and lacks is Missing.
- Verify passed on `HEAD`. Green on `HEAD` but red after the trial merge, or a conflict, is Critical: the slice breaks a sibling, so name the base commits it collides with.

What the diff cannot show (behaviour in unchanged code, a contract another Sub-issue holds) goes on a `Cannot verify:` line instead of widening the search.

## 6. Quality verdict

- **Correctness.** Logic errors, unhandled failure paths, races, data loss, security holes, on the lines the diff adds. Step outside the diff only to chase one specific risk (a contract that changed, state two paths share), and say what you read.
- **Tests.** They assert behaviour through the interface, they would fail without the change, and none is skipped or snapshot-only.
- **Depth.** Call the Skill tool with "codebase-design" and apply its `DEPTH-CHECK.md` to each module the pull request creates and each whose interface it reshapes, reporting each fired question at the gate severity it gives.
- **Laws.** The documents on the Routing block's Laws line. A repo without that line is judged by its `GLOSSARY.md`, `CLAUDE.md`, `AGENTS.md`, `CONTRIBUTING.md` and ADR folder, whichever exist. Where nothing is written down, a smell (a name that hides its job, duplicated logic, generality nobody asked for) is a Minor finding at most.
- **Scope.** A declared Interface deviation must have been needed; an unneeded one is Important and its fix is the signature the issue states.

Done when every module in scope has had the four Depth check questions and every Law on the line has been held against the diff.

## Findings

Each finding is one line, in the shape the retro parses:

```text
- <Critical|Important|Minor> · [<source>#<id>] · <file:line> · <what is wrong> · <what it breaks> · <the fix, when it is not obvious>
```

- **Severity.** Critical: wrong behaviour, a missed requirement, data loss, a broken sibling. Important: the change cannot be trusted until fixed. Minor: polish. A verdict fails as soon as one Critical or Important finding sits under it. Something the linked issue itself demands is still a finding, marked *ticket-mandated*, for a person to settle.
- **Confidence.** Report only what you can pin to a line and a concrete failure and are at least 80% sure of. Drop old problems the change did not touch (Depth check question 3 aside), lint and type-checker territory, taste, and lines carrying a deliberate suppression.
- **Law tag.** The bracket names the Law the finding enforces. `source` is a document as the Laws line writes it (`[CLAUDE.md#Prose]`), `ADR-<nnnn>`, `epic` with the decision's name, `ticket` with the section (`[ticket#Interfaces]`), `cited` with the cited document's heading, `skill` with this skill's rule (`[skill#Ticket section]`), or `none` when no written rule covers it. `[none]` is a judgement that no Law applies; it is never a missing tag.

## 7. Record and post

Write the comment to a file made with `mktemp`, in this order and with nothing else in it: no preamble, no summary.

```markdown
## Spec: PASS | FAIL
- <findings>
Cannot verify: <items | none>

## Quality: PASS | FAIL
- <findings>

Verify: `<sha7>` passed | failed (`<command>`)
Trial merge: skipped, base unchanged | `<sha7>` into `<base>` passed | failed (`<command>`) | conflicts in `<files>`
Checks: <reading from spp checks>
```

In a quality-only run, the Spec section is left out. Before posting, `grep -nE '^- (Critical|Important|Minor) · ([^[]|$)' "$FILE"` must print nothing: every hit is a finding with no Law tag.

For a slice, record the verdicts first:

```bash
spp verdict "$PR" --ticket "$N" --head "$HEAD" --spec <pass|fail> --quality <pass|fail>
```

It writes the pull request's `<!-- spp-verdict -->` Marker comment, and only while the pull request is still at `HEAD`. Exit 3 means a new commit landed during the review: discard the draft and start again at step 2 on the new head. Then post the comment with `gh pr review "$PR" --comment --body-file "$FILE"`, never `--approve` or `--request-changes`.

Done when the marker names `HEAD` (for a slice) and the review comment is on the pull request.

## 8. Return

Reply to whoever started the review with the two verdict lines, `Verify:` with the short sha, each Critical and Important finding, any promoted ponytail finding, and the comment's URL. Routing a failure (a fix round, a Hand-back) belongs to the caller.
