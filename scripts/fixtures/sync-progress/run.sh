#!/usr/bin/env bash
# Fixture driver for sync-progress.sh. check-sdd.sh word-splits a case's `args` line and parses stdout as
# JSON lines, so this re-reads the line with shell quoting, runs the script from the repo root (directly, so a lost executable bit fails every case), and prints
# one line {exit, stdout, stderr (first line)}, then the decoded data trailer of each write that carries one.
set -uo pipefail
ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
cd "$ROOT"
eval "set -- $*"
ERR=$(mktemp); trap 'rm -f "$ERR"' EXIT
OUT=$(skills/engineering/sync-progress/scripts/sync-progress.sh "$@" 2>"$ERR"); CODE=$?
jq -c -n --argjson exit "$CODE" --arg out "$OUT" --arg err "$(head -n1 "$ERR")" '{exit: $exit, stdout: $out, stderr: $err}'
jq -c 'select(.body // "" | test("<!-- sdd-data: ")) | {data: (.body | capture("<!-- sdd-data: (?<d>[^ ]*) -->\n?$").d | @base64d | fromjson)}' "${GH_WRITES:-/dev/null}"
