---
name: sync-progress
description: Upsert an idempotent SDD marker comment on a GitHub issue, and claim or unclaim the issue with the claim mark. Use when an SDD skill records status on a sub-issue or epic (sdd-progress, sdd-plan, sdd-wave, sdd-summary, sdd-retro) without posting a second comment.
---

# Sync Progress

One issue, one progress comment. Every update **rewrites the same comment** found by a hidden HTML marker; it never appends a second one. Claiming an issue means setting the claim mark (the label `claimed`); unclaiming means removing it. The markers and upsert are `gh`; the claim mark has one form per tracker, listed under Claim and unclaim.

## Markers

| Marker | Lives on | Written by |
|---|---|---|
| `<!-- sdd-progress -->` | a sub-issue | `implement-issue`, `review-pr` |
| `<!-- sdd-plan -->` | the epic | `to-tickets` (SDD pass) |
| `<!-- sdd-wave -->` | the epic | `build-epic` |
| `<!-- sdd-summary -->` | the epic | `close-epic` |
| `<!-- sdd-retro -->` | the epic | `close-epic` (numbers from GitHub state; stays in the repo) |
| `<!-- sdd-feedback-draft -->` | the epic (one per draft) | `close-epic`, only when nobody can approve an upstream filing |

The marker is the **first line** of the comment body. Nothing else identifies the comment.

## Upsert

```bash
ISSUE=123                            # or an issue URL; see below
MARKER='<!-- sdd-progress -->'
BODY_FILE=/tmp/progress.md          # first line must be the marker

# Resolve repo + number from a URL, else from the current checkout.
case "$ISSUE" in
  https://github.com/*) REPO=$(printf '%s' "$ISSUE" | sed -E 's#https://github.com/([^/]+/[^/]+)/issues/.*#\1#'); ISSUE=${ISSUE##*/} ;;
  *) REPO=$(gh repo view --json nameWithOwner --jq .nameWithOwner) ;;
esac
COMMENT_ID=$(gh api "repos/$REPO/issues/$ISSUE/comments" --paginate \
  --jq ".[] | select(.body | startswith(\"$MARKER\")) | .id" | head -n1)

if [ -n "$COMMENT_ID" ]; then
  gh api -X PATCH "repos/$REPO/issues/comments/$COMMENT_ID" -F body=@"$BODY_FILE" >/dev/null
else
  gh api -X POST "repos/$REPO/issues/$ISSUE/comments" -F body=@"$BODY_FILE" >/dev/null
fi
```

`scripts/progress-comment.sh <issue# | URL> <marker> <body-file>` in this skill's base directory does the same in one call.

Rewrite the **whole** body every time. Read the previous body first only if you need to carry a section forward (for example the `Started` timestamp); otherwise regenerate from current state.

## Progress body

```markdown
<!-- sdd-progress -->
**Status:** in-progress | verify-passed | pr-open | changes-requested | blocked | done
**Worker:** <agent name locally, the Actions run URL in the cloud, the login for a human>
**Branch:** `sdd/<N>-<slug>`
**PR:** #<n> (or none)
**Verify:** not run | passed <short sha> | failed <short sha>

<one to five lines: what is done, what is next, anything the reviewer should know>
```

Keep the body under 20 lines. Detail belongs in the PR, not the issue.

## Claim and unclaim

The claim is a **Claim mark**: the label `claimed`. It is never an assignee.

```bash
# claim: create the label idempotently first, because adding a label the repo lacks fails
gh label create claimed --color FBCA04 --description "Held by a worker; set before work, cleared on stopping without a PR" --force
gh issue edit "$ISSUE" --add-label claimed

# unclaim (on failure or hand-off)
gh issue edit "$ISSUE" --remove-label claimed
```

Claim mark per tracker:

- GitHub: label `claimed`, with the `gh` commands above.
- GitLab: label `claimed`, with `glab issue update <n> --label claimed` to claim and `glab issue update <n> --unlabel claimed` to unclaim. Create the label once in the project: `glab label create --name claimed --color "#FBCA04" --description "Held by a worker; set before work, cleared on stopping without a PR"`.
- Local tracker: the `Status: claimed` line in the ticket file. Set it to claim; restore the previous `Status:` value to unclaim.

A ticket is **held** when it carries the `claimed` label or an assignee. A held ticket is out of the ready queue, so **claim before any work starts** and **unclaim whenever you stop without a PR**. Agents write only the mark, never an assignee, and a human's self-assignment counts as held. Never add the mark over a ticket that is already held, whether by another worker's mark or a person's assignment; report it instead. The holder's name lives in the progress comment's **Worker** line.

## Escalation labels

When you unclaim because you are stuck, also set the label that routes the issue:

| Situation | Label to add | Label to remove |
|---|---|---|
| The ticket is ambiguous or contradicts the code | `needs-info` | `ready-for-agent` |
| A human decision or secret is needed | `ready-for-human` | `ready-for-agent` |
| A blocker was discovered that the tracker does not know about | `blocked` + `gh issue edit N --add-blocked-by <M>` | none |

```bash
gh issue edit "$ISSUE" --add-label needs-info --remove-label ready-for-agent
```

Explain **why** in the progress comment before you stop.
