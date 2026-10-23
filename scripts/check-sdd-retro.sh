#!/usr/bin/env bash
# check-sdd-retro.sh [retro script]
# Runs close-epic's sdd-retro.sh against each fixture in scripts/fixtures/sdd-retro/ with a stub gh
# on PATH, and compares its JSON (minus harness and gh versions) with the fixture's expected.json.
set -uo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
RETRO="${1:-$ROOT/skills/engineering/close-epic/scripts/sdd-retro.sh}"
FIX="$ROOT/scripts/fixtures/sdd-retro"
STUB=$(mktemp -d); trap 'rm -rf "$STUB"' EXIT
SHARED="$ROOT/scripts/fixtures/gh"
[ -f "$SHARED" ] || { echo "missing shared stub gh: $SHARED" >&2; exit 1; }
cp "$SHARED" "$STUB/gh"; chmod +x "$STUB/gh"

FAIL=0
for D in "$FIX"/*/; do
  NAME=$(basename "$D")
  EPIC=$(jq -r '[.issues[] | select(.subIssues.nodes | length > 0) | .url] | first' "$D/gh.json")
  read -r -a ARGS < "$D/args" || true
  GOT=$(PATH="$STUB:$PATH" GH_FIXTURE="$D/gh.json" SDD_HARNESS=fixture bash "$RETRO" "$EPIC" ${ARGS[@]+"${ARGS[@]}"} 2>&1)
  if DIFF=$(diff <(jq -S 'del(.harness, .gh)' "$D/expected.json") <(printf '%s' "$GOT" | jq -S 'del(.harness, .gh)' 2>&1)); then
    echo "ok   $NAME"
  else
    echo "FAIL $NAME"; printf '%s\n' "$DIFF" | sed 's/^/     /'; FAIL=1
  fi
done
exit "$FAIL"
