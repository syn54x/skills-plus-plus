---
name: review-panel
description: Run the review panel on a pull request to the base branch, usually an Epic's. Several Personas read it in parallel, and one report ends in MERGE, FIX FIRST or HUMAN DECISION.
disable-model-invocation: true
---

The main gate for a big Epic. A slice gets one reviewer; the pull request that carries a whole Epic to the base branch gets a **panel**: the Epic's spec verdict, then several **Personas**, each reading the same diff with a fixed focus. The Personas only find. `spp findings merge` deduplicates what they found, and this skill turns the result into one report whose verdict follows from the findings, so the same findings always give the same report. The panel edits nothing and never merges; the person does.

Usage: `/review-panel <pull request number | URL>`

`build` runs the panel by itself when `spp next` reports `panel: true` for the Epic (the thresholds are the Routing block's `Panel` line, read by `parseRouting`). A person who types the command has already decided, so no threshold is checked here.

## 1. Check the target

```bash
PR=$(gh pr view 60 --json number --jq .number)   # 60, or its URL, resolved once to the number every later step uses
gh pr view "$PR" --json state,isDraft,baseRefName,headRefOid,body,additions,deletions,files
gh repo view --json defaultBranchRef --jq .defaultBranchRef.name
```

Stop, and say why, when:

- The pull request is closed, merged or a draft.
- Its base is not the default branch (or the release line the person names). A slice into an integration branch gets `/review`; a panel there costs nine reviews for one slice.

The pull request body's `Closes #N` names its issue. Run `spp kind N`: for `epic`, `EPIC` is that issue and its body, plan comment and Sub-issues are the spec. For anything else the pull request body is the spec, and the report's Coverage line says so.

Done when the target is open, ready and aimed at the base branch, and you know the spec's source.

## 2. Gather once

Make the **panel directory** and fill it; every Persona reads from here and nothing is pasted into prompts.

```bash
PANEL_DIR="${TMPDIR:-/tmp}/spp-panel-$PR"; mkdir -p "$PANEL_DIR"
```

Check the head out detached in a throwaway worktree, never in the checkout you stand in, then write into `$PANEL_DIR`: `diff.patch` (`git diff -U8 "$MERGE_BASE" "$HEAD"`, three-dot meaning, so only what the pull request adds), `stat.txt`, `commits.txt`, `spec.md` (the Epic body, plus the plan comment's text, plus each Sub-issue's `## Interfaces` and `## Files owned`: the Sub-issue urls come from `spp status "$EPIC" --json`, which carries no bodies, so read each with `gh issue view <url> --json body`), `laws.txt` (the paths of the documents on the Routing block's Laws line, a directory listed file by file) and a copy of this skill's `PERSONAS.md`.

Then run the evidence once, on `HEAD`:

- **Verify.** Each closed Sub-issue's `## Verify` block, or the command the repo's `CLAUDE.md` names for its whole suite. Record passed or failed, and the command.
- **Checks.** `spp checks "$PR" --json`. The panel reads it once and never waits on a pending run.
- **Head.** Read `headRefOid` again; when it moved, redo this step for the new head, because the diff and the checks must describe the same commit.

Finish with `context.md` in `$PANEL_DIR`: the pull request URL, `BASE` and `HEAD`, a line per file above (including the absolute path of the `DEPTH-CHECK.md` that the `codebase-design` skill holds), the Verify line, and the Checks line. Call the Skill tool with "codebase-design" to learn where that file is.

Done when `$PANEL_DIR` holds all of it and `HEAD` is the head GitHub shows now.

## 3. Spec and Coherence

Call the Skill tool with "review" for this pull request. It is an Epic's pull request, so `review` follows its Epic mode: the spec verdict against the Epic and the Coherence verdict where Sub-issues meet. Open the request with `For the panel: return, do not post`, which switches on the mode `EPIC.md` in `review` describes for this case: it posts nothing and returns the comment text. Keep that text verbatim for the report.

A failed Spec does not stop the panel; it makes the verdict FIX FIRST (see `VERDICT.md`).

Done when you hold the Spec and Coherence sections for `HEAD`.

## 4. Pick the Personas

The Focus blocks and the rules every Persona shares are in `PERSONAS.md`; the Personas read it, you only choose among them.

**Always on (six):** `correctness`, `testing`, `maintainability`, `standards-and-invariants`, `history`, `depth`.

**Conditional:** add each one the diff touches, judged from `stat.txt` and `diff.patch` rather than from keywords: `security`, `reliability`, `adversarial`, `data-migration`, `api-contract`. A diff of instruction prose (skills, docs, configuration) skips `depth`.

**A Friend.** When `ponytail-review` is among the skills you can call, add the `ponytail` Persona. Its own verdict is never read; only its findings are, and they face the same merge as every other Persona's. Without it nothing changes and nothing is said.

At most nine Personas run. When the list is longer, drop conditionals in this order: `data-migration`, `reliability`, `security`, `api-contract`, `adversarial`, `ponytail`, and name each drop in Coverage.

Print the set on one line with the reason for each non-default entry, then continue. It is progress, not a question.

Done when the list of Persona names is fixed.

## 5. Fan out

Start one fresh read-only reviewer per Persona, all at once, and collect each one's findings JSON. On a harness with plugin workflows, `CLAUDE-CODE.md` names the workflow that does exactly this fan-out and nothing else. Without one, start the reviewers yourself with the same sentence:

> You are the `<persona>` Persona on the panel for pull request `<PR>`. The panel directory is `spp-panel-<PR>` under `$TMPDIR` (`/tmp` when it is unset). Read `PERSONAS.md` there (the rules, then your section), then `context.md`, and reply with your findings JSON only.

With no way to run reviewers at once, run them one after another, each in a fresh context, always-on Personas first. It is slower and no weaker.

Write each reply to `$PANEL_DIR/persona-<name>.json`. A reply that is not the findings JSON is asked for once more; a Persona that fails twice is listed in Coverage as `did not report` and the verdict is FIX FIRST.

Done when every Persona has a `persona-<name>.json` or a `did not report` line.

## 6. Merge, then report

```bash
spp findings merge "$PANEL_DIR"/persona-*.json --verdict <R> --spec <pass|fail> --coherence <pass|fail> \
  --verify <pass|fail> --checks <pass|fail|pending|none> [--missing <name,name>]
```

`<R>` is the round (1 for the first panel); the readings are the ones you hold from steps 2 and 3, and `--missing` names each Persona listed as `did not report`. The command drops findings under confidence 80, merges the ones on the same file, within five lines, with the same normalised title (keeping the highest severity and every Persona's name), numbers them `F1`, `F2` and on, prints the three tallies, and ends with a `Verdict:` line. Do not merge, rank, re-number or re-decide by hand.

Read `VERDICT.md` now and write the report around the merge output: the verdict line is copied, and you add only its one sentence, the Spec and Coherence sections, the Coverage lines and Residual risk.

Show the report, then record the round when the pull request has an Epic:

```bash
spp wave "$EPIC" panel --round <R> --verdict "<verdict>" --severity critical=<n>,important=<n>,minor=<n> --persona <name>=<n>,... --dropped <n>
```

The numbers are the merge output's tallies, with a `--persona` entry for every Persona that ran, `0` included.

Ask once whether to post the report as a comment on the pull request. Post only on a yes, with `gh pr comment "$PR" --body-file <file>` (never an approval or a request for changes), then repeat the `spp wave` call with `--report <comment URL>`. A report never posted stays on the wave comment as `unposted`. Without an Epic, nothing is recorded.

Done when the report is shown and the round is on the wave comment.

## 7. Route

- **MERGE** or **HUMAN DECISION**: hand the report to the person. Minor `depth` findings, candidate ADRs and terminology drift go to `/close-epic`'s Learnings.
- **FIX FIRST**: read `ROUNDS.md` now. It groups the Critical and Important findings by Sub-issue, runs the fix rounds (two at most) and the Composition pass that follows each, and says when the decision passes to the person.

Done when the person holds the report and the next step is named.
