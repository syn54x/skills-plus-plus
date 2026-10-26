#!/usr/bin/env bash
# check-sdd.sh [<name>...]
# Runs every fixture set scripts/fixtures/<name>/ that carries a `script` file (or only the named sets),
# then, with no names given, every skills/engineering/*/scripts/*-check.sh. One ok or FAIL line each.
#
# Per set: `script` holds the repo-relative path of the script under test; an optional `env` holds
# KEY=VALUE lines exported for every case. Per case directory: `args` (one line, word-split), `gh.json`
# for the stub gh, and `expected.json` (compared minus .harness and .gh) or `expected.jsonl` (per line);
# an optional `expected-writes.jsonl` is compared with the stub's write log, key order ignored.
set -uo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
FIXTURES="$ROOT/scripts/fixtures"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
cp "$FIXTURES/gh" "$TMP/gh"; chmod +x "$TMP/gh"

FAIL=0
fail() { echo "FAIL $1"; printf '%s\n' "$2" | sed 's/^/     /'; FAIL=1; }

run_set() {
  local name="$1" set="$FIXTURES/$1" script case_dir case epic got diff
  [ -f "$set/script" ] || { fail "$name" "no fixture set with a script file at scripts/fixtures/$name"; return; }
  script="$ROOT/$(head -n1 "$set/script")"
  for case_dir in "$set"/*/; do
    case=$(basename "$case_dir")
    : >"$TMP/writes.jsonl"
    epic=()
    # These two scripts take the epic URL first: the first issue in gh.json with sub-issues.
    case "$name" in sdd-ready|sdd-retro)
      epic=("$(jq -r '[.issues[] | select((.subIssues.nodes // []) | length > 0) | .url] | first' "$case_dir/gh.json")") ;;
    esac
    ARGS=(); [ -f "$case_dir/args" ] && { read -r -a ARGS <"$case_dir/args" || true; }
    got=$(
      [ -f "$set/env" ] && { set -a; . "$set/env"; set +a; }
      PATH="$TMP:$PATH" GH_FIXTURE="$case_dir/gh.json" GH_WRITES="$TMP/writes.jsonl" \
        bash "$script" ${epic[@]+"${epic[@]}"} ${ARGS[@]+"${ARGS[@]}"} 2>&1
    )
    if [ -f "$case_dir/expected.json" ]; then
      diff=$(diff <(jq -S 'del(.harness, .gh)' "$case_dir/expected.json") <(printf '%s' "$got" | jq -S 'del(.harness, .gh)' 2>&1))
    else
      diff=$(diff <(jq -S -c . "$case_dir/expected.jsonl") <(printf '%s\n' "$got" | jq -S -c . 2>&1))
    fi
    if [ -z "$diff" ] && [ -f "$case_dir/expected-writes.jsonl" ]; then
      diff=$(diff <(jq -S -c . "$case_dir/expected-writes.jsonl") <(jq -S -c . "$TMP/writes.jsonl" 2>&1))
    fi
    if [ -z "$diff" ]; then echo "ok $name/$case"; else fail "$name/$case" "$diff"; fi
  done
}

if [ $# -gt 0 ]; then
  for name in "$@"; do run_set "$name"; done
else
  for set in "$FIXTURES"/*/; do [ -f "$set/script" ] && run_set "$(basename "$set")"; done
  # The in-skill checks build their own inputs; each one is a single line here, its output shown on failure.
  for check in "$ROOT"/skills/engineering/*/scripts/*-check.sh; do
    rel=${check#"$ROOT"/}
    if out=$(bash "$check" 2>&1); then echo "ok $rel"; else fail "$rel" "$out"; fi
  done
fi
exit "$FAIL"
