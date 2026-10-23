#!/usr/bin/env bash
# sdd-retro-check.sh: fixture check for sdd-by-cause.py, the retro's Law tag counter.
# Feeds inline review bodies on stdin and compares the by_cause object it prints; needs no gh.
# Exits non-zero when any case does not get the expected result.
set -uo pipefail

COUNTER="$(cd "$(dirname "$0")" && pwd)/sdd-by-cause.py"
FAILS=0
# check <name> <expected JSON> ; JSON array of review bodies on stdin
check() {
  local name="$1" want got
  want=$(jq -cS . <<<"$2")
  got=$(python3 "$COUNTER" 2>/dev/null | jq -cS . 2>/dev/null)
  if [ "$got" = "$want" ]; then echo "ok   $name"; else echo "FAIL $name (want $want, got ${got:-nothing})"; FAILS=$((FAILS + 1)); fi
}

FAIL_SPEC='## Spec: FAIL
- Important · [AGENTS.md#I-5] · src/a.py:10 at abc1234 · Missing · no retry · the ticket asks for one
- Critical · [ticket#Interfaces] · src/a.py:3 at abc1234 · Misunderstood · wrong name · Produces says load()
Cannot verify: none

## Quality: PASS

Verify: PR head `abc1234` passed'

FAIL_QUALITY='## Spec: PASS
Cannot verify: none

## Quality: FAIL
- Important · [AGENTS.md#I-2] · src/b.py:7 at def5678 · swallows the error · callers never see it
- Minor · [epic#Failure law] · src/b.py:9 at def5678 · logs instead of raising · the epic says raise
- Minor · [cited#Register doors] · src/c.py:1 at def5678 · door not registered · the cited doc lists it
- Important · [skill#Laws section] · PR body · no Laws section · implement-issue §6 asks for one
- Minor · [none] · tests/test_b.py:4 at def5678 · test asserts a mock · proves nothing

Verify: PR head `def5678` passed'

PASS_REVIEW='## Spec: PASS
Cannot verify: none

## Quality: PASS
- Minor · [AGENTS.md#I-9] · src/d.py:2 at 0aa0aa0 · a nit worth noting

Verify: PR head `0aa0aa0` passed'

UNTAGGED='## Spec: FAIL
- Important · src/e.py:12 at 1bb1bb1 · Missing · no error path · the ticket asks for one'

RE_REVIEW='Scoped re-review of abc1234..fed9876.

## Spec: PASS
- ADDRESSED · src/a.py:10 · retry added
- ADDRESSED · src/a.py:3 · renamed to load()
- NOT ADDRESSED · src/b.py:7 · still swallows

## Quality: FAIL
- Important · [ADR-0009] · src/f.py:20 at fed9876 · new cache bypasses the ADR · stale reads'

# Input by redirection, not a pipe: a piped check runs in a subshell and loses FAILS.
check "two FAIL reviews grouped by source, the PASS review not counted" \
  '{"AGENTS.md": 2, "ticket#Interfaces": 1, "epic": 1, "cited": 1, "skill": 1, "none": 1}' \
  < <(jq -n --arg a "$FAIL_SPEC" --arg b "$FAIL_QUALITY" --arg c "$PASS_REVIEW" '[$a, $b, $c]')
check "an untagged finding counts as none" '{"none": 1}' < <(jq -n --arg a "$UNTAGGED" '[$a]')
check "scoped re-review: ADDRESSED lines skipped" '{"ADR-0009": 1}' < <(jq -n --arg a "$RE_REVIEW" '[$a]')
check "an empty array is null" 'null' <<<'[]'
check "PASS reviews only: nothing counted" '{}' < <(jq -n --arg c "$PASS_REVIEW" '[$c]')

[ "$FAILS" -eq 0 ] && echo "sdd-retro-check: all passed" || echo "sdd-retro-check: $FAILS failed"
[ "$FAILS" -eq 0 ]
