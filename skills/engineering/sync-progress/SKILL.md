---
name: sync-progress
description: Upsert an idempotent SDD marker comment on a GitHub issue, and claim or unclaim the issue by assignment. Use when an SDD skill records status on a sub-issue or epic (sdd-progress, sdd-plan, sdd-wave, sdd-summary, sdd-retro) without posting a second comment.
---

# Sync Progress

One issue, one progress comment. Every update **rewrites the same comment** found by a hidden HTML marker; it never appends a second one. Claiming an issue means assigning yourself; unclaiming means removing the assignment. All of it is `gh`.

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
**Worker:** <agent name or "cloud">
**Branch:** `sdd/<N>-<slug>`
**PR:** #<n> (or none)
**Verify:** not run | passed <short sha> | failed <short sha>

<one to five lines: what is done, what is next, anything the reviewer should know>
```

Keep the body under 20 lines. Detail belongs in the PR, not the issue.

## Claim and unclaim

```bash
gh issue edit "$ISSUE" --add-assignee @me        # claim
gh issue edit "$ISSUE" --remove-assignee @me     # unclaim (on failure or hand-off)
```

A claim is what removes an issue from the ready queue, so **claim before any work starts** and **unclaim whenever you stop without a PR**. Never reassign an issue that another login already holds; report it instead.

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
