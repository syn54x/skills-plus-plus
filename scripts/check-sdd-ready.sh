#!/usr/bin/env bash
# check-sdd-ready.sh [ready script]
# Runs build-epic's ready.sh against each fixture in scripts/fixtures/sdd-ready/ with the shared stub gh
# on PATH, and compares its JSON lines (key order ignored) with the fixture's expected.jsonl.
set -uo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
READY="${1:-$ROOT/skills/engineering/build-epic/scripts/ready.sh}"
FIX="$ROOT/scripts/fixtures/sdd-ready"
STUB=$(mktemp -d); trap 'rm -rf "$STUB"' EXIT
SHARED="$ROOT/scripts/fixtures/gh"
[ -f "$SHARED" ] || { echo "missing shared stub gh: $SHARED" >&2; exit 1; }
cp "$SHARED" "$STUB/gh"; chmod +x "$STUB/gh"

FAIL=0
for D in "$FIX"/*/; do
  NAME=$(basename "$D")
  EPIC=$(jq -r '[.issues[] | select((.subIssues.nodes // []) | length > 0) | .url] | first' "$D/gh.json")
  read -r -a ARGS < "$D/args" || true
  GOT=$(PATH="$STUB:$PATH" GH_FIXTURE="$D/gh.json" bash "$READY" "$EPIC" ${ARGS[@]+"${ARGS[@]}"} 2>&1)
  if DIFF=$(diff <(jq -S -c . "$D/expected.jsonl") <(printf '%s\n' "$GOT" | jq -S -c . 2>&1)); then
    echo "ok   $NAME"
  else
    echo "FAIL $NAME"; printf '%s\n' "$DIFF" | sed 's/^/     /'; FAIL=1
  fi
done
exit "$FAIL"
