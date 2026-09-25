#!/usr/bin/env bash
# progress-comment.sh <issue# | issue URL> <marker> <body-file>
# Upserts one comment on the issue: finds the comment whose body starts with <marker>
# and rewrites it, or creates it. The body file's first line must be the marker.
#
#   progress-comment.sh 103 '<!-- sdd-progress -->' /tmp/progress.md
set -euo pipefail

ISSUE="${1:?usage: progress-comment.sh <issue# | URL> <marker> <body-file>}"
MARKER="${2:?marker}"
BODY_FILE="${3:?body-file}"

if [ "$(head -n1 "$BODY_FILE")" != "$MARKER" ]; then
  echo "progress-comment: first line of $BODY_FILE must be the marker $MARKER" >&2
  exit 2
fi

case "$ISSUE" in
  https://github.com/*)
    REPO=$(printf '%s' "$ISSUE" | sed -E 's#https://github.com/([^/]+/[^/]+)/issues/.*#\1#')
    ISSUE=${ISSUE##*/} ;;
  *) REPO=$(gh repo view --json nameWithOwner --jq .nameWithOwner) ;;
esac

# gh api --jq takes no --arg, so the marker goes in through the environment.
COMMENT_ID=$(MARKER="$MARKER" gh api "repos/$REPO/issues/$ISSUE/comments" --paginate \
  --jq '.[] | select(.body | startswith(env.MARKER)) | .id' | head -n1)

if [ -n "$COMMENT_ID" ]; then
  gh api -X PATCH "repos/$REPO/issues/comments/$COMMENT_ID" -F body=@"$BODY_FILE" --jq .html_url
else
  gh api -X POST "repos/$REPO/issues/$ISSUE/comments" -F body=@"$BODY_FILE" --jq .html_url
fi
