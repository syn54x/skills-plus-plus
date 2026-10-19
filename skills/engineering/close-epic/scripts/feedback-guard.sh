#!/usr/bin/env bash
# feedback-guard.sh <body-file> [--profile counts|detailed|attributed] [--own owner/repo]
#                   [--repo owner/repo ...] [--title-file <file>]
# Refuses (exit 2) a skill-feedback body that would leak anything about the user's repo:
#   1. any URL                          4. a fenced code block or code-looking line
#   2. the repo/org names given         5. a ticket/PR title (from --title-file, one per line)
#   3. a path that exists in the checkout   6. error text, stack traces, exit codes
# --profile is the routing block's `Upstream feedback:` value (default counts; a legacy `on` reads
# as counts). counts and detailed apply all six rules. attributed needs --own, the user's own
# owner/repo, and lets through that repo's issue and PR links, its owner/repo string and its bare
# repo name; any other URL or repo name, the bare owner name, and rules 3 to 6 still block.
# off, or an unknown profile, exits 1: nothing may be filed.
# It names the rule and the line; it never rewrites. Run from the repo checkout.
set -uo pipefail

USAGE="usage: feedback-guard.sh <body-file> [--profile counts|detailed|attributed] [--own owner/repo] [--repo owner/repo ...] [--title-file <file>]"
BODY="${1:?$USAGE}"; shift || true
REPOS=(); TITLES=""; PROFILE=counts; OWN=""
while [ $# -gt 0 ]; do
  case "$1" in
    --profile) PROFILE="$2"; shift 2;;
    --own) OWN="$2"; shift 2;;
    --repo) REPOS+=("$2"); shift 2;;
    --title-file) TITLES="$2"; shift 2;;
    *) echo "feedback-guard: unknown arg $1" >&2; exit 1;;
  esac
done

case "$PROFILE" in
  on) PROFILE=counts;;
  counts|detailed) ;;
  attributed) [ -n "$OWN" ] || { echo "feedback-guard: --profile attributed needs --own owner/repo" >&2; exit 1; };;
  off) echo "feedback-guard: profile off: nothing may be filed" >&2; exit 1;;
  *) echo "feedback-guard: unknown profile '$PROFILE' (off | counts | detailed | attributed)" >&2; exit 1;;
esac

fail() { echo "feedback-guard: BLOCKED (rule $1): $2" >&2; exit 2; }

# Rules 1 and 2 read SCAN: the body, or under attributed the body with the own repo's issue and
# PR links, its owner/repo string and its bare repo name removed. Rules 3 to 6 read BODY.
SCAN="$BODY"
if [ "$PROFILE" = attributed ]; then
  SCAN=$(mktemp); trap 'rm -f "$SCAN"' EXIT
  OWN="$OWN" perl -pe '
    my $own = $ENV{OWN}; my ($name) = $own =~ m{([^/]+)$};
    s{https?://github\.com/\Q$own\E/(?:issues|pull)/[0-9]+(?:#[A-Za-z0-9_-]+)?(?![A-Za-z0-9/_.-])}{}gi;
    s{\Q$own\E(?![A-Za-z0-9_-])}{}gi;
    s{(?<![A-Za-z0-9_./-])\Q$name\E(?![A-Za-z0-9_-])}{}gi;
  ' "$BODY" > "$SCAN"
fi

# 1. URLs
if grep -nE 'https?://' "$SCAN" >/dev/null; then fail 1 "$(grep -nE 'https?://' "$SCAN" | head -n1)"; fi

# 2. repo / org names (given, plus the current checkout's)
# The current checkout counts too, unless it is the feedback board itself (dogfooding must be able to say "skills").
CUR=$(gh repo view --json nameWithOwner --jq .nameWithOwner 2>/dev/null || true)
[ -n "$CUR" ] && [ "$CUR" != "syn54x/skills-plus-plus" ] && REPOS+=("$CUR")
# The own repo stays on the list: under attributed its names are already out of SCAN, its bare owner name is not.
[ -n "$OWN" ] && [ "$OWN" != "syn54x/skills-plus-plus" ] && REPOS+=("$OWN")
for R in "${REPOS[@]:-}"; do
  [ -z "$R" ] && continue
  OWNER=${R%%/*}; NAME=${R##*/}
  for TOKEN in "$R" "$NAME" "$OWNER"; do
    [ ${#TOKEN} -lt 3 ] && continue
    if grep -niF -- "$TOKEN" "$SCAN" >/dev/null; then fail 2 "mentions '$TOKEN': $(grep -niF -- "$TOKEN" "$SCAN" | head -n1)"; fi
  done
done

# 3. paths that exist in the checkout
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  # shellcheck disable=SC2016  # the backticks in the pattern are literal
  while read -r TOKEN; do
    T=${TOKEN#\`}; T=${T%\`}; T=${T%%[,.:;)]}
    case "$T" in */*) if git ls-files --error-unmatch -- "$T" >/dev/null 2>&1 || [ -e "$T" ]; then fail 3 "path '$T' exists in the checkout"; fi;; esac
  done < <(grep -oE '[`]?[A-Za-z0-9_./-]+/[A-Za-z0-9_./-]+[`]?' "$BODY" | sort -u)
fi

# 4. code
if grep -nE '^```' "$BODY" >/dev/null; then fail 4 "fenced code block"; fi
if grep -nE '(;\s*$|\{\s*$|=>|^\s*(def|func|import|from|class|const|let|var|return)\s)' "$BODY" >/dev/null; then
  fail 4 "$(grep -nE '(;\s*$|\{\s*$|=>|^\s*(def|func|import|from|class|const|let|var|return)\s)' "$BODY" | head -n1)"
fi

# 5. ticket / PR titles
if [ -n "$TITLES" ] && [ -f "$TITLES" ]; then
  while IFS= read -r TITLE; do
    [ "$(printf '%s' "$TITLE" | wc -w)" -le 3 ] && continue
    if grep -niF -- "$TITLE" "$BODY" >/dev/null; then fail 5 "contains ticket title"; fi
  done < "$TITLES"
fi

# 6. error text, traces, exit codes
if grep -nE '(Traceback|Error:|Exception|exit code [0-9]+|^\s+at [A-Za-z_./]+:[0-9]+)' "$BODY" >/dev/null; then
  fail 6 "$(grep -nE '(Traceback|Error:|Exception|exit code [0-9]+|^\s+at [A-Za-z_./]+:[0-9]+)' "$BODY" | head -n1)"
fi

echo "feedback-guard: ok"
exit 0
