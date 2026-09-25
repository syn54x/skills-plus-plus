---
name: close-epic
description: Close an SDD epic once every sub-issue is closed and its PR to main has merged (summary comment, retro from GitHub state, Learnings, consented skill feedback, close). Use when build-epic finishes after the user merges, or the user asks to close or wrap up an epic.
---

# Close Epic

A few `gh` calls and one honest summary. Never closes an epic with open sub-issues. Everything it computes comes from GitHub state (labels, assignees, marker comments, PR reviews), so it works the same on any host and needs nothing from the conversation.

Usage: `/close-epic <epic#> [--dry-run]`

## 1. Check

```bash
EPIC=42
gh issue view "$EPIC" --json state,subIssuesSummary,subIssues \
  --jq '{state, summary: .subIssuesSummary, open: [.subIssues.nodes[] | select(.state=="OPEN") | .number]}'
```

- `open` is non-empty → stop. Report the open tickets and their assignees; the epic is not done.
- `state` is already `CLOSED` → stop; nothing to do.
- Also check that the integration-branch PR (if any) has merged to `main`: `gh pr list --search "head:feat/<slug>" --state merged`. In a multi-repo epic, check **every** repo named in the plan comment (`gh pr list -R owner/repo …`). If any has not merged, say so and ask whether to close anyway; the default is **no**.

## 2. Collect

For each sub-issue, the PR that closed it:

```bash
for URL in $(gh issue view "$EPIC" --json subIssues --jq '.subIssues.nodes[].url'); do
  gh issue view "$URL" --json number,title,url,closedByPullRequestsReferences \
    --jq '"\(.url)\t\(.title)\t\(.closedByPullRequestsReferences | map(.url) | join(", "))"'
done
```

URLs rather than numbers, so a multi-repo epic's table is unambiguous.

Read each sub-issue's progress comment and each PR's review for anything flagged `DONE_WITH_CONCERNS`, anything that went to `ready-for-human`, and any plan edge that was added mid-build.

## 3. Retro

Compute the epic's numbers per [RETRO.md](./RETRO.md): tickets by size, escalations (`needs-info`, `ready-for-human`, `blocked` label events), edges added mid-build (from the wave comment), fix rounds per PR (from `review-pr` verdicts), Verify-block corrections (from PR bodies), panel findings by severity and persona plus the dropped count (from the `review-panel` report), and claim-to-PR time. If installed as the plugin, `${CLAUDE_PLUGIN_ROOT}/scripts/sdd-retro.sh <epic url>` prints the JSON; the reference holds the portable `gh` form.

Upsert it on the epic under `<!-- sdd-retro -->` (call the Skill tool with "sync-progress" for the upsert): a short table for humans, then the JSON in a fenced block. This comment stays in the user's repo; it may contain URLs and titles.

## 4. Summary comment

Upsert on the epic under `<!-- sdd-summary -->`:

```markdown
<!-- sdd-summary -->
## Done

| Repo | Ticket | PR | Notes |
|---|---|---|---|
| pinch-backend | #101 add invoice status column | #55 | none |
| pinch-backend | #102 invoice events | #56 | went to ready-for-human once (flaky fixture), fixed in #56 |
| pinch-backend | #103 create invoice endpoint | #57 | none |
| pinch-frontend | #104 invoice UI | #31 | none |

Integration branch `feat/invoices`: pinch-backend merged to `main` in #60, pinch-frontend in #33. (Drop the Repo column for a single-repo epic.)

## Learnings

Each learning carries one tag:
- **[repo]** <a convention workers kept missing, a Verify block that lied for this codebase → goes to CLAUDE.md or an ADR; name the file>
- **[reusable]** <something true beyond this repo → `docs/solutions/<slug>.md`, only if genuinely reusable>
- **[skill: <name> §<step>]** <the skill told the agent the wrong thing, or nothing, and the retro shows it → candidate for upstream feedback, step 5>

Also carry forward from the `review-panel` report: candidate ADRs and terminology drift, each as a [repo] learning.

## Spec deltas

<if the epic body has a Spec deltas section, confirm each ADDED / MODIFIED / REMOVED item shipped, or note which did not and why>
```

Keep it under 40 lines. Facts only; no praise. The retro numbers are the evidence for every **[skill]** tag: a learning without a number behind it is an opinion, and it stays [repo].

## 5. Upstream feedback (only with consent)

**[skill]** learnings can become issues on `syn54x/skills-plus-plus` so the skills improve. This never happens silently. Follow [SKILL-FEEDBACK.md](./SKILL-FEEDBACK.md) exactly; the short version:

1. **Off unless on.** The routing block in `CLAUDE.md` / `AGENTS.md` must say `Upstream feedback: on`. Anything else, or no line, means skip this step entirely and say so in one line.
2. **Allowlist, not redaction.** The issue body is built from the fixed template in the reference: skill, step, a failure category from the closed enum, the relevant retro counts, harness and `gh` version. Never the repo or org name, URLs, ticket titles, file paths, code, commit messages or error text. The only free text is one sentence the user types at confirmation.
3. **Preview and confirm, every time.** Show the complete body. The user approves, edits, or skips each one. `--dry-run` stops here and prints the bodies.
4. **No human, no filing.** In a non-interactive run (Actions, a headless worker), do not file. Write each would-be body as a draft under `<!-- sdd-feedback-draft -->` on the epic; the user files later with one command from the reference.
5. **Private repos always confirm.** `gh repo view --json isPrivate`; if true, the draft path is the default for any run that cannot ask.
6. **Guard before filing.** Run the outbound check (`scripts/feedback-guard.sh` in this skill's base directory, or the checks listed in the reference by hand): any GitHub URL, the repo or org name, a path that exists in the checkout, or a fenced code block blocks the filing. The guard refuses; it never rewrites.
7. **File as the user, visibly.** `gh issue create -R syn54x/skills-plus-plus --label skill-feedback` under the user's own account, or `--web` if they prefer to file from a browser. Tell them the issue is public and carries their GitHub identity.

## 6. Close

```bash
gh issue close "$EPIC" --reason completed --comment "All sub-issues closed; summary above."
gh issue edit "$EPIC" --remove-label needs-plan 2>/dev/null || true
```

## 7. Report

One line to the user: epic closed, N tickets, M PRs, link to the summary comment, and how many skill-feedback issues were filed, drafted, or skipped. If you wrote a `docs/solutions/` file, name it.
