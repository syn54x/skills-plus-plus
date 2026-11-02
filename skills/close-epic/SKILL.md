---
name: close-epic
description: Finish a merged Epic. Checks that all Sub-issues are closed and the integration branch has merged, posts the summary and the retro, confirms the Spec deltas shipped, offers skill feedback with your consent, and closes the Epic.
disable-model-invocation: true
---

The last step of the Epic path. It runs after a person has merged the Epic's integration branch, and it reads everything it reports from GitHub, so it needs nothing from the session that built the Epic. Every number comes from `spp`; the judgement in it is the Learnings.

Usage: `/close-epic <epic number | issue URL>`

## 1. Gate

```bash
spp status "$EPIC" --json
```

Stop, and say why, at the first of these that holds:

- A Sub-issue is open: its `state` in the output is anything but `merged` (a closed Sub-issue reads `merged`). Name each one with its state and its `worker`; the Epic is not done.
- The Epic already carries a comment whose first line is `<!-- sdd-summary -->` (`gh issue view "$EPIC" --json comments --jq '.comments[].body | select(startswith("<!-- sdd-summary -->"))'` prints something). This skill has run on it before, and a second run would rewrite the record.
- The integration branch (`epic.branch` in the output, from the plan comment) has no merged pull request: `gh pr list --head "$BRANCH" --state merged --json number,baseRefName,url`. For a **Multi-repo epic**, run it against each repo on the plan comment's Repos line with `-R <owner/repo>`. Ask the person whether to close anyway; with no clear yes, stop.

An Epic that is already closed passes the gate. The pull request to the base branch says `Closes #<epic>`, so the merge usually closed it before this skill started.

## 2. Collect

```bash
spp retro "$EPIC" --json
```

It returns `byCause` (fix-round findings by **Law tag**), `byTicket`, `rounds`, `handBacks`, `panel` and `ponytail`. A value of `"not found"` means its input was missing, and stderr names what: write **not found** in the comment, never 0. `ponytail` is `"not found"` whenever ponytail did not run on the Epic, so say "did not run" for it.

Read the plan comment (first line `<!-- sdd-plan -->`) for its Deviated lines, and each Sub-issue's progress comment for a Hand-back reason. Those become the Note column in step 4.

**Sort the causes by whether the worker was told.** Read the Laws line of the Routing block in the repo's `CLAUDE.md` or `AGENTS.md`. Each `byCause` key is a Law tag whose source is the part before `#`. Add each key's count to one of two totals:

- **told**: the source is `epic`, `ticket`, `cited` or `skill`, or a repo document on the Laws line (a file it names, or a file under a directory it names). The worker was handed that Law and broke it anyway.
- **not told**: any other repo path. No step pointed the worker at it, so the fix is to add it to the Laws line.

`none` (an untagged finding) joins neither total. Both totals go into the retro comment.

## 3. Retro comment

Write the body to a file whose first line is `<!-- sdd-retro -->`: a table with one row per number from step 2 (with the told and not-told totals beside `byCause`), then the `spp retro` JSON in a fenced block. Post it:

```bash
spp upsert "$EPIC" '<!-- sdd-retro -->' "$RETRO_FILE"
```

The retro stays in the person's repo, so it may name files, titles and links.

## 4. Summary

The summary is prose a person reads, so call the Skill tool with "writing-for-humans" first. The body, in this order:

```markdown
<!-- sdd-summary -->
## Shipped

| Sub-issue | Pull request | Note |
| --- | --- | --- |
| #101 invoice status column | #55 | none |
| #102 invoice events | #56 | handed back once (needs-info: fixture path), then merged |

`feat/invoices` merged into `main` in #60.

## Learnings

<one bullet per learning, in the format of LEARNINGS.md>

## Spec deltas

<each delta, and whether it shipped>
```

- **Shipped**: one row per Sub-issue, its pull request taken from `spp status`. Add a Repo column only for a Multi-repo epic. The Note says what the record shows: a Hand-back and its route, an **Interface deviation**, or `none`.
- **Learnings**: read [LEARNINGS.md](LEARNINGS.md) now and write each one in its format. Every number from step 2 that is above zero is a candidate; so are the panel's leftover Minor findings and any terminology drift it reported. A `[skill]` learning needs a number from the retro behind it, or it is a `[repo]` learning. A large **not told** total is a `[repo]` learning about the Laws line; a large **told** total points at whichever skill step should have checked that Law.
- **Spec deltas**: when the Epic's body carries `## Spec deltas` (amendments made while building), go through it item by item and confirm each shipped, by naming the merged pull request that carries it. Name each one that did not ship and why. With no such section, write `None recorded.`

Keep the comment under 40 lines and to facts, with no praise. Post it:

```bash
spp upsert "$EPIC" '<!-- sdd-summary -->' "$SUMMARY_FILE"
```

## 5. Skill feedback

Any `[skill]` learning can be proposed upstream as **Skill feedback**, filed against `syn54x/skills-plus-plus`. Read [FEEDBACK.md](FEEDBACK.md) now and follow it for every one. It holds the profile, the allowlist, the outbound check and the drafts comment. Two rules hold whatever it says:

- Nothing is filed without a person approving that exact body in this run. A run where no person can answer (CI, a scheduled task, an unattended worker) files nothing and writes drafts instead.
- Every proposed issue asks for an eval case that reproduces the defect to land with its fix.

With no `[skill]` learning, or a profile of `off` or none, skip this step and note the skip in the report.

## 6. Close

```bash
test "$(gh issue view "$EPIC" -q .state --json state)" = OPEN \
  && gh issue close "$EPIC" --comment "Every Sub-issue merged; the summary and retro are above." --reason completed
```

Only an Epic the merge left open reaches the close: the repo turned auto-close off, or the pull request lacked the keyword.

## 7. Report

Tell the person, in one line: whether this run or the merge closed the Epic, the counts of Sub-issues and pull requests, the summary comment's link, and the count of feedback issues filed, drafted and skipped.
