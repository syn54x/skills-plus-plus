#!/usr/bin/env bash
# worktree-guard.sh: refuses to remove a worktree that still has uncommitted changes, or
# unpushed commits on an `sdd/*` branch. Exit 2 blocks; stderr goes back to the agent.
#
# Runs under three hook shapes, detected from stdin:
#   Claude Code WorktreeRemove   → `name` (worktree name); resolved via `git worktree list`
#   Claude Code / Codex PreToolUse (Bash) → `tool_input.command`; acts only on `git worktree remove …`
#   Cursor beforeShellExecution  → `command`; same
# Anything else is a no-op.
set -uo pipefail

INPUT=$(cat 2>/dev/null || true)

# BSD sed: no \| alternation, so a value ends at its first double quote (paths with quotes are not supported).
field() { printf '%s' "$INPUT" | sed -n "s/.*\"$1\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p" | head -n1; }

CWD=$(field cwd)
[ -z "$CWD" ] && CWD="${CURSOR_PROJECT_DIR:-${CLAUDE_PROJECT_DIR:-}}"
[ -n "$CWD" ] && [ -d "$CWD" ] && cd "$CWD"

WT=""
CMD=$(field command)
if [ -n "$CMD" ]; then
  # Shell-command mode: only `git worktree remove <path>` concerns us.
  case "$CMD" in
    *"git worktree remove"*|*"git -C "*" worktree remove"*) ;;
    *) exit 0 ;;
  esac
  # Last non-flag argument after "remove" is the path.
  WT=$(printf '%s' "$CMD" | sed -n 's/.*worktree remove[[:space:]]*\(.*\)$/\1/p' \
        | tr ' ' '\n' | grep -v '^-' | grep -v '^$' | tail -n1)
  [ -n "$WT" ] && [ ! -d "$WT" ] && [ -n "$CWD" ] && [ -d "$CWD/$WT" ] && WT="$CWD/$WT"
else
  NAME=$(field name)
  WT=$(field worktree_path)
  [ -z "$WT" ] && WT=$(field path)
  if [ -z "$WT" ] && [ -n "$NAME" ] && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    WT=$(git worktree list --porcelain | awk -v n="$NAME" '
      /^worktree /{p=substr($0,10)}
      /^branch /{b=substr($0,8); sub("^refs/heads/","",b);
        if (p ~ ("/" n "$") || b == ("worktree-" n) || b == n) {print p; exit}}')
  fi
fi

# Unresolvable: not ours to judge; never guard the main checkout by accident.
[ -n "$WT" ] && [ -d "$WT" ] || exit 0
git -C "$WT" rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0

if [ -n "$(git -C "$WT" status --porcelain)" ]; then
  echo "sdd worktree guard: $WT has uncommitted changes. Commit or stash them before removing the worktree." >&2
  exit 2
fi

BRANCH=$(git -C "$WT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
case "$BRANCH" in
  sdd/*)
    if ! git -C "$WT" rev-parse --verify -q "origin/$BRANCH" >/dev/null; then
      echo "sdd worktree guard: $BRANCH has never been pushed. Push it (git push -u origin $BRANCH) before removing the worktree." >&2
      exit 2
    fi
    AHEAD=$(git -C "$WT" rev-list --count "origin/$BRANCH..HEAD" 2>/dev/null || echo 0)
    if [ "$AHEAD" != "0" ]; then
      echo "sdd worktree guard: $BRANCH is $AHEAD commit(s) ahead of origin. Push before removing the worktree." >&2
      exit 2
    fi
    ;;
esac

exit 0
