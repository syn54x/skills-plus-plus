#!/usr/bin/env bash
# feedback-guard-check.sh: fixture check for feedback-guard.sh, one case per profile and rule.
# Runs in a throwaway git checkout with a stub `gh` that reports acme/widgets as the current repo.
# Exits non-zero when any case does not get the expected result.
set -uo pipefail

GUARD="$(cd "$(dirname "$0")" && pwd)/feedback-guard.sh"
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

mkdir -p "$WORK/bin" "$WORK/repo/src"
cat > "$WORK/bin/gh" <<'EOF'
#!/usr/bin/env bash
[ "$1 $2" = "repo view" ] && { echo "acme/widgets"; exit 0; }
exit 1
EOF
chmod +x "$WORK/bin/gh"
cd "$WORK/repo" || exit 1
git init -q . && echo x > src/app.py && git add src/app.py
export PATH="$WORK/bin:$PATH"

TITLES="$WORK/titles.txt"
echo "Add invoice export to the billing page" > "$TITLES"

FAILS=0
# check <name> <expected exit> <guard args...> ; body on stdin
check() {
  local name="$1" want="$2"; shift 2
  cat > "$WORK/body.md"
  "$GUARD" "$WORK/body.md" "$@" --title-file "$TITLES" >/dev/null 2>"$WORK/err"
  local got=$?
  if [ "$got" = "$want" ]; then echo "ok   $name"; else echo "FAIL $name (want $want, got $got: $(cat "$WORK/err"))"; FAILS=$((FAILS + 1)); fi
}

COUNTS='**Skill:** to-tickets SDD §1
**Category:** verify-block-wrong
**Observed:** 2 of 6 tickets needed their Verify block corrected; 1 fix round was caused by it.'

DETAILED='**Skill:** to-tickets SDD §1
**Category:** verify-block-wrong
**Observed:** The skill told the agent to copy the test command from the epic. The agent copied it as written, and the command named a runner the repo does not use. The user rewrote the Verify block by hand on two tickets before the workers could run it.'

BY_CAUSE='**Skill:** implement-issue §4
**Category:** law-read-not-checked
**Observed:** 5 of 7 fix-round findings cited a Law on the Laws line; 1 cited a repo file off it.
**Retro counts:** tickets 6 (S2 M3 L1, 2 repos) · fix rounds 3/2 PRs/max 2 · by cause: repo 4 · epic 1 · ticket 1 · cited 0 · skill 1 · none 1 · law-read-not-checked 5 · law-not-in-read-list 1'

ATTR_OK="$DETAILED
**Repo:** acme/widgets
**Epic:** https://github.com/acme/widgets/issues/40
**Tickets:** https://github.com/acme/widgets/issues/41, https://github.com/acme/widgets/issues/42
**PRs:** https://github.com/acme/widgets/pull/43
The widgets repo hit this twice."

# off: nothing leaves, so the guard refuses to pass anything
check "off refuses"                          1 --profile off <<<"$COUNTS"
check "unknown profile refuses"              1 --profile loud <<<"$COUNTS"
# counts (the default, and what a legacy 'on' means)
check "counts template passes"               0 --profile counts <<<"$COUNTS"
check "no profile defaults to counts"        0 <<<"$COUNTS"
check "on reads as counts"                   0 --profile on <<<"$COUNTS"
check "counts blocks a URL"                  2 --profile counts <<<"$COUNTS
see https://example.com/x"
check "counts blocks the repo name"          2 --profile counts <<<"$COUNTS
in widgets"
# detailed: multi-sentence Observed passes; all six rules unchanged
check "detailed prose passes"                0 --profile detailed <<<"$DETAILED"
check "detailed blocks own repo URL"         2 --profile detailed <<<"$DETAILED
https://github.com/acme/widgets/issues/40"
check "detailed blocks own repo name"        2 --profile detailed <<<"$DETAILED
acme/widgets"
# attributed: own repo links and name pass; everything else still blocks
check "attributed needs --own"               1 --profile attributed <<<"$ATTR_OK"
check "attributed own links and name pass"   0 --profile attributed --own acme/widgets <<<"$ATTR_OK"
check "attributed blocks other repo URL"     2 --profile attributed --own acme/widgets <<<"$ATTR_OK
https://github.com/acme/secret-app/issues/3"
check "attributed blocks non-GitHub URL"     2 --profile attributed --own acme/widgets <<<"$ATTR_OK
https://example.com/x"
check "attributed blocks own blob URL"       2 --profile attributed --own acme/widgets <<<"$ATTR_OK
https://github.com/acme/widgets/blob/main/src/app.py"
check "attributed blocks other repo name"    2 --profile attributed --own acme/widgets --repo acme/secret-app <<<"$ATTR_OK
also secret-app"
check "attributed blocks bare owner name"    2 --profile attributed --own acme/widgets <<<"$ATTR_OK
the acme team"
check "attributed blocks a path"             2 --profile attributed --own acme/widgets <<<"$ATTR_OK
see src/app.py"
check "attributed blocks code"               2 --profile attributed --own acme/widgets <<<"$ATTR_OK
const x = 1;"
check "attributed blocks a ticket title"     2 --profile attributed --own acme/widgets <<<"$ATTR_OK
Add invoice export to the billing page"
# by cause line and the two Law categories: family names carry no path, so every profile passes
check "counts by-cause body passes"          0 --profile counts <<<"$BY_CAUSE"
check "detailed by-cause body passes"        0 --profile detailed <<<"$BY_CAUSE"
check "attributed by-cause body passes"      0 --profile attributed --own acme/widgets <<<"$BY_CAUSE"
check "attributed blocks error text"        2 --profile attributed --own acme/widgets <<<"$ATTR_OK
TypeError: x is undefined"

[ "$FAILS" -eq 0 ] && echo "feedback-guard-check: all passed" || echo "feedback-guard-check: $FAILS failed"
[ "$FAILS" -eq 0 ]
