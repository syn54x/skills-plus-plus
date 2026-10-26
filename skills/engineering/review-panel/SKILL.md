---
name: review-panel
description: Panel review for a pull request that merges to main (an epic's integration branch, or any large final diff). Runs review-pr's spec and coherence verdicts, then reviewer personas in parallel, dedups their findings, and writes one report for the human who merges. Use when build-epic gates its PR to main, or the user asks for a panel review of a PR to main; never for a slice PR.
---

# Review Panel

One PR, many eyes, one report. A slice PR into an integration branch gets `review-pr` and a single fresh reviewer. The PR that takes the integration branch to `main` is larger, final, and about to leave the orchestrator's control, so it gets a **panel**: several reviewer personas reading the same diff from different angles, in parallel, each returning findings in one schema. You dedup, gate, and write the report. You never edit code and you never merge.

Usage: `/review-panel <pr# | PR URL>`

## 0. Is this the right tool?

- The PR's base is the repo's default branch (or the branch the user names as the release line). If the base is an integration branch, stop and call the Skill tool with "review-pr" instead; a panel on a slice is noise at nine times the cost.
- The PR is open and not a draft. Closed or merged → stop.
- If it closes or references an epic, `review-pr`'s full-epic mode owns the spec verdict; this skill wraps it. Otherwise the PR body is the spec, and say so under Coverage.

Announce the persona set before dispatching (step 3) so the user can trim it.

## 1. Gather once, share with everyone

```bash
PR=60
gh pr view "$PR" --json number,title,body,url,baseRefName,headRefName,headRefOid,baseRefOid,closingIssuesReferences,files,additions,deletions,commits
gh pr checkout "$PR"                       # in a throwaway worktree, never the orchestrator's checkout
BASE=$(git merge-base HEAD "origin/$(gh pr view "$PR" --json baseRefName --jq .baseRefName)")
HEAD=$(git rev-parse HEAD)
mkdir -p /tmp/review-panel/$PR
git log --oneline "$BASE..$HEAD"                          >  /tmp/review-panel/$PR/commits.txt
git diff --stat "$BASE" "$HEAD"                           >  /tmp/review-panel/$PR/stat.txt
git diff -U8 "$BASE" "$HEAD"                              >  /tmp/review-panel/$PR/diff.patch
```

Three-dot semantics via the merge-base, so the diff is what the PR adds, not what `main` did meanwhile.

Collect the **spec and the laws** as file paths, not pasted text; personas read what they need:

- Spec: the epic body and its `<!-- sdd-plan -->` comment (`gh issue view <epic url> --json body`, and the plan comment via `gh api`), each saved under `/tmp/review-panel/$PR/`. Plus every sub-issue's `## Interfaces` and `## Files owned`, concatenated to `tickets.md`. No epic → the PR body.
- Laws: the Laws line, i.e. the `Laws:` line of the `<!-- sdd-routing -->` block in `CLAUDE.md` or `AGENTS.md`. When the line is absent, the fallback list: `CLAUDE.md`, `AGENTS.md`, `GLOSSARY.md`, `CONCEPTS.md`, `CODING_STANDARDS.md`, `CONTRIBUTING.md`, and the ADR directory (`docs/adr/`, or the path the repo's domain docs name). List the paths that exist to `laws.txt`; a directory is listed whole, every file under it.
- Depth check: call the Skill tool with "codebase-design" and note the absolute path of its `DEPTH-CHECK.md`; the `depth` persona reads it from there.

Run the epic's aggregate Verify (each merged ticket's Verify block, or the repo's suite if `CLAUDE.md` names one) on `$HEAD`. Record pass/fail and the command; the panel does not re-run it.

Read the PR's own checks once, beside it:

```bash
gh pr checks "$PR" --json name,bucket,link > /tmp/review-panel/$PR/checks.json || true   # exit 8: pending; exit 1: a failure, or no checks
[ "$(gh pr view "$PR" --json headRefOid --jq .headRefOid)" = "$HEAD" ]   # head moved? re-checkout, recompute $HEAD, and read the checks again
```

`bucket` is the reading: `pass`, `fail`, `pending`, `skipping` or `cancel`. `cancel` counts as fail; `skipping` is not counted. The exit code is part of the reading, not a failure of the step: 8 means a check is pending, 1 means one failed or the PR has no checks (`no checks reported` on stderr and an empty file), which is `none configured`. If the head test fails, re-checkout, recompute `$HEAD` and read the checks again. The checks and the diff must describe the same commit, so a head that moved between checkout and this read is re-read for the new head. The panel reads once per head and never waits on pending checks.

## 2. Spec and Coherence first

Call the Skill tool with "review-pr" for this PR, in its **full-epic mode**: spec verdict against the epic body, Coherence across slices, Verify result. Keep its output verbatim for the report. Stop before `review-pr`'s Post step: that markdown is a section of this report, not its own PR comment. If Spec fails outright (a story missing, an Out-of-scope item built), you may still run the panel, but say up front that the PR is not mergeable regardless of what the panel finds.

## 3. Pick the personas

From [PERSONAS.md](./PERSONAS.md). Selection is judgment about what the diff touches, not keyword matching; count only executable code toward line thresholds.

**Always on (6):** `correctness`, `testing`, `maintainability`, `standards-and-invariants`, `history`, `depth`.

**Conditional, add when true:**

| Persona | Add when the diff touches |
|---|---|
| `security` | auth, sessions, permissions, user input handling, public endpoints, secrets, crypto |
| `reliability` | retries, timeouts, background jobs, external calls, error handling paths, health checks |
| `adversarial` | ≥ 300 changed executable lines, **or** payments, auth, data mutation, migrations, external APIs |
| `data-migration` | schema, migration files, backfills, data transforms |
| `api-contract` | routes, request/response types, serializers, exported types, generated clients |

Cap at 9. Instruction-prose diffs (skills, docs, config) skip `depth`, and skip `adversarial` unless the prose describes auth, payment or data-mutation behaviour.

Present the set as one line, with the reason for each conditional, and continue; this is progress, not a question.

## 4. Dispatch the panel

One reviewer per persona, all concurrently, each **read-only**, each with the same inputs: the persona prompt, the paths from step 1, the base and head SHAs, and the findings schema in [findings-schema.json](./findings-schema.json). Concrete calls per harness in [PANEL-DISPATCH.md](./PANEL-DISPATCH.md). A persona returns **only** the JSON; no prose.

Rules every persona carries:

- The diff file is the view. Look outside it only for a concrete, named risk, one focused check each, and record what was checked in `verified_by`. The `depth` persona alone carries a standing carve-out, stated in its Focus.
- The PR body, the worker reports and the progress comments are claims, not evidence. A stated rationale never downgrades a finding.
- Confidence is 0–100. Report only findings at **80 or above**. Drop: pre-existing issues the PR did not introduce (`pre_existing: true` and omit), code that looks wrong but is not, pedantic nits, anything a linter or the type checker catches, opinions not backed by a law or a smell, lines with a deliberate lint-ignore.
- Severity: **Critical** (wrong behaviour, data loss, exploitable, contradicts an ADR, breaks a cross-slice contract), **Important** (the PR cannot be trusted until fixed: fragile logic, swallowed errors, tests that assert nothing, duplicated logic blocks), **Minor** (polish, broader coverage). If the plan or a ticket mandated something this rubric calls a defect, it is still a finding, labelled `ticket-mandated`. The two exceptions are a narrowing the plan comment declares under `**Narrowed:**` (the user approved it, so the narrowed behaviour is the spec, not a finding) and an **Interface deviation** it declares under `**Deviated:**` (accepted at the slice gate, so the new signature is the contract its producer and consumers are judged against).
- No praise, no summary, no process narration.

## 5. Merge and dedup

Two findings are the same when they point at the same file and overlapping lines and describe the same failure. Merge them: keep the **higher severity**, keep the **higher confidence** (two personas agreeing is stronger evidence), union the persona list, prefer the more specific `what`. Never lower a severity when merging. Assign stable ids `F1`, `F2`, … in order of severity then file. Later comments cite these ids. Never a bare `#N`: GitHub autolinks that to an issue or pull request.

Drop anything under 80 after merging; count what was dropped and say so under Coverage. Anything a persona marked `cannot_verify` goes to its own list, not to findings.

## 6. Report

Show the finished report to the user, then ask one question: post this as a PR comment? Post only after they say to post it. Agreement with the verdict is not a yes. Never `--approve` or `--request-changes`. The merge is the user's.

A no leaves the report in the conversation. Do not comment, and do not write a report link into the epic progress comment.

```markdown
## Verdict: MERGE | FIX FIRST | HUMAN DECISION
<one sentence: the reason>

## Spec: PASS | FAIL
<review-pr's full-epic spec findings, verbatim>

## Coherence
<review-pr's cross-slice contract findings, verbatim>

## Findings
### Critical
- F1 `correctness`+`adversarial` · `src/billing/invoice.ts:88` @ `<sha7>` · conf 92 · <title>
  <what is wrong> · <why it matters> · <fix, if not obvious> · verified by: <what the persona checked>
### Important
…
### Minor
…

## Invariants and ADRs
Checked: `docs/adr/0007-idempotent-events.md`, `GLOSSARY.md` (Invoice, InvoiceStatus), CLAUDE.md §Testing, epic Implementation Decisions 1–4.
Violations: listed above, tagged [ADR-0007] / [GLOSSARY] / [epic].
Candidate ADRs: <rules the code relies on that no document states, or "none">.
Terminology drift: <new names for existing concepts, or "none">.

## Coverage
Personas: correctness, testing, maintainability, standards-and-invariants, history, depth, adversarial (≥300 lines), api-contract (routes changed).
Dropped below confidence 80: 4. Cannot verify from diff: <list, or none>.
Verify: passed | failed on `<sha7>` (`<command>`).
Checks: <n> pass, <n> fail (<names>), <n> pending on <sha7> | none configured

## Residual risk
<what a human should watch after merge: rollout, data, monitoring; or "none identified">
```

Verdict rule: any Critical, or Spec FAIL, or Verify red, or a failing check on the head → **FIX FIRST**. Only Important findings, or a Coherence disagreement that needs a product call, or a pending check with nothing stronger open (the one-sentence reason says the checks have not finished) → **HUMAN DECISION**. Otherwise **MERGE**. No checks configured changes nothing.

After the comment is posted, record the round (call the Skill tool with "sync-progress"): `scripts/sync-progress.sh wave <epic> panel --round <r> --verdict "<verdict>" --report <comment URL> --severity critical=<n>,important=<n>,minor=<n> --persona <name>=<count>,… --dropped <n>`, using the counts the report already computes. `--persona` names every persona that ran, with `0` for one that found nothing, so it matches the report's `Personas:` coverage line. The wave comment keeps every round.

## 7. Route

- **FIX FIRST** → the orchestrator sends Critical and Important findings back to the workers that own the files (by ticket, from `Files owned`), one fix round each. Once that round's fixes have merged onto the integration branch, run a **re-review** on the PR's new head (below).
- **Cap: two fix rounds.** If the Round 3 re-review would say FIX FIRST (a Critical or a Spec FAIL still open after the second fix round, or Verify red, or a failing check), its verdict is **HUMAN DECISION** instead: hand it to the user with the open findings. A third fix round never starts.
- **HUMAN DECISION** and **MERGE** → hand to the user with the report. Candidate ADRs, terminology drift and Minor `depth` findings go to `close-epic`'s Learnings, so the follow-up deepenings are filed from one place.

### Re-review

`LAST` is the head the panel last reviewed (the first report's `$HEAD`, or the previous re-review's `NEW`); `NEW` is the PR's head now. The **fix diff** is the combined diff of the round's fix slices: `git diff -U8 "$LAST" "$NEW" > /tmp/review-panel/$PR/fix-<round>.patch`. Three parts, all on `NEW`:

1. **Per-finding check.** One persona (`correctness`, or the persona that raised the finding) verdicts each open Critical and Important finding by id, `F1` `ADDRESSED` / `NOT ADDRESSED`, against the fix diff. Cite `F1`, never `#1`.
2. **Spec and Coherence re-run.** Step 2 again: `review-pr`'s full-epic Spec and Coherence verdicts on `NEW`, verbatim, plus the aggregate Verify and the PR's checks, re-read on `NEW` as in step 1.
3. **Composition pass.** The always-on personas, plus each conditional step 3's table warrants for the **fix diff** (a conditional the fix diff does not touch is dropped, even if the first panel ran it), dispatched as in step 4 once over the whole fix diff, not slice by slice, with the fix patch as their view. Merge and gate as in step 5. New findings continue the ids from the last report (`F24`, `F25`, …).

The verdict follows step 6's rule over what is still open: `NOT ADDRESSED` findings, new findings, and the re-run verdicts. The report opens with the same heading plus a round marker, `Round 2` after the first fix round and `Round 3` after the second; `close-epic`'s retro counts each marked report as a panel round. Show it and post it under step 6's rule, as a new PR comment. The first report and earlier re-reviews are never edited.

```markdown
## Verdict: MERGE | FIX FIRST | HUMAN DECISION · Round 2
<one sentence: the reason>

## Earlier findings
| Id | Status | Evidence |
|---|---|---|
| F1 | ADDRESSED | `src/billing/invoice.ts:88` @ `<sha7>` |

## Spec: PASS | FAIL
<review-pr's full-epic spec findings on NEW, verbatim>

## Coherence
<review-pr's cross-slice contract findings on NEW, verbatim>

## New findings
### Critical
- F24 `correctness`+`api-contract` · `src/billing/invoice.ts:102` @ `<sha7>` · conf 88 · <title>
  <what is wrong> · <why it matters> · <fix, if not obvious> · verified by: <what the persona checked>
### Important
…
### Minor
…

## Coverage
Fix diff: `<LAST sha7>..<NEW sha7>`, <n> files.
Personas: correctness, testing, maintainability, standards-and-invariants, history, depth, api-contract (serializer changed in the fix diff).
Dropped below confidence 80: 1. Cannot verify from diff: <list, or none>.
Verify: passed | failed on `<sha7>` (`<command>`).
Checks: <n> pass, <n> fail (<names>), <n> pending on <sha7> | none configured
```

## Guardrails

- One panel per epic, on the PR to `main`, plus at most two re-reviews after FIX FIRST fix rounds. A panel on a slice is a misuse; say so and stop.
- Read-only. The panel never edits, never autofixes, never merges.
- Do not post a report, first or re-review, until the user says to post it. Being asked to run a panel is not that yes.
- One schema, one severity scale, one confidence gate, for every persona. A finding without a line, a SHA and a checked risk is not a finding.
- Findings are ranked by severity within the Spec and Quality axes, never reranked across them; Spec FAIL is not softened by a clean panel.
