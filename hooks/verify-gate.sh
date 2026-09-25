#!/usr/bin/env bash
# verify-gate.sh: Stop / SubagentStop hook (Claude Code, Codex: `Stop`; Cursor: `stop`).
# On an `sdd/*` branch, refuse to stop until the ticket's Verify block has been recorded
# on HEAD (implement-issue step 5 writes `git notes --ref=sdd-verify`) and the tree is clean.
# Anywhere else: no-op. Exit 2 blocks the stop and feeds stderr back to the agent.
set -uo pipefail

INPUT=$(cat 2>/dev/null || true)

# Avoid loops: if this hook already blocked once, let the stop through.
#   Claude Code / Codex: stop_hook_active=true   Cursor: loop_count > 0
if printf '%s' "$INPUT" | grep -q '"stop_hook_active"[[:space:]]*:[[:space:]]*true'; then
  exit 0
fi
LOOPS=$(printf '%s' "$INPUT" | sed -n 's/.*"loop_count"[[:space:]]*:[[:space:]]*\([0-9]*\).*/\1/p')
if [ -n "$LOOPS" ] && [ "$LOOPS" != "0" ]; then
  exit 0
fi

CWD=$(printf '%s' "$INPUT" | sed -n 's/.*"cwd"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
[ -z "$CWD" ] && CWD="${CURSOR_PROJECT_DIR:-${CLAUDE_PROJECT_DIR:-}}"
[ -n "$CWD" ] && [ -d "$CWD" ] && cd "$CWD"

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
case "$BRANCH" in
  sdd/*) ;;
  *) exit 0 ;;
esac

if [ -n "$(git status --porcelain)" ]; then
  echo "sdd verify gate: uncommitted changes on $BRANCH. Commit them, run the ticket's Verify block, then record it: git notes --ref=sdd-verify add -f -m verified HEAD" >&2
  exit 2
fi

if ! git notes --ref=sdd-verify show HEAD >/dev/null 2>&1; then
  echo "sdd verify gate: no Verify record on HEAD of $BRANCH. Run the ticket's Verify block (green), then: git notes --ref=sdd-verify add -f -m verified HEAD. If you are stopping because you are BLOCKED: unclaim per sync-progress, push what is committed, then record the state instead: git notes --ref=sdd-verify add -f -m blocked HEAD" >&2
  exit 2
fi

exit 0
