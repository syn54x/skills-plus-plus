#!/usr/bin/env bash
# sdd-retro.sh <epic url> [--integration-pr <pr url>]
# Computes the epic retro from GitHub state and prints the sdd-retro/1 JSON.
# See skills/engineering/close-epic/RETRO.md for what each number means and the portable gh form.
# Best-effort report: no errexit, every measure degrades to 0/null rather than aborting the retro.
set -uo pipefail

EPIC_URL="${1:?usage: sdd-retro.sh <epic url> [--integration-pr <pr url>]}"
INT_PR=""
if [ "${2:-}" = "--integration-pr" ]; then INT_PR="${3:?pr url}"; fi

repo_of() { printf '%s' "$1" | sed -E 's#https://github.com/([^/]+/[^/]+)/(issues|pull)/.*#\1#'; }
num_of()  { printf '%s' "${1##*/}"; }

EPIC_REPO=$(repo_of "$EPIC_URL"); EPIC_N=$(num_of "$EPIC_URL")
TICKETS=$(gh issue view "$EPIC_URL" --json subIssues --jq '.subIssues.nodes[].url')

# ---- tickets by size, repos --------------------------------------------------
S=0; M=0; L=0; TOTAL=0; REPOS=""
for URL in $TICKETS; do
  TOTAL=$((TOTAL+1))
  REPOS="$REPOS $(repo_of "$URL")"
  case "$(gh issue view "$URL" --json labels --jq '[.labels[].name | select(startswith("size:"))] | first // ""')" in
    size:S) S=$((S+1));; size:M) M=$((M+1));; size:L) L=$((L+1));;
  esac
done
NREPOS=$(printf '%s\n' $REPOS | grep . | sort -u | wc -l | tr -d ' ')

# ---- escalations (label events), claim time ---------------------------------
NI=0; RH=0; BL=0; HOURS=""
PRS=""
for URL in $TICKETS; do
  R=$(repo_of "$URL"); N=$(num_of "$URL")
  EV=$(gh api "repos/$R/issues/$N/events" --paginate 2>/dev/null || echo '[]')
  NI=$((NI + $(printf '%s' "$EV" | jq '[.[] | select(.event=="labeled" and .label.name=="needs-info")] | length')))
  RH=$((RH + $(printf '%s' "$EV" | jq '[.[] | select(.event=="labeled" and .label.name=="ready-for-human")] | length')))
  BL=$((BL + $(printf '%s' "$EV" | jq '[.[] | select(.event=="labeled" and .label.name=="blocked")] | length')))
  CLAIMED=$(printf '%s' "$EV" | jq -r '[.[] | select(.event=="assigned")] | first | .created_at // empty')
  TPRS=$(gh issue view "$URL" --json closedByPullRequestsReferences --jq '.closedByPullRequestsReferences[].url')
  PRS="$PRS $TPRS"
  FIRST_PR=$(printf '%s\n' $TPRS | head -n1)
  if [ -n "$CLAIMED" ] && [ -n "$FIRST_PR" ]; then
    OPENED=$(gh pr view "$FIRST_PR" --json createdAt --jq .createdAt)
    H=$(python3 -c 'import sys,datetime as d;a,b=[d.datetime.fromisoformat(x.replace("Z","+00:00")) for x in sys.argv[1:]];print(round((b-a).total_seconds()/3600,2))' "$CLAIMED" "$OPENED")
    HOURS="$HOURS $H"
  fi
done
MEDIAN=$(printf '%s\n' $HOURS | grep . | python3 -c 'import sys,statistics as s;v=[float(x) for x in sys.stdin.read().split()];print(round(s.median(v),2) if v else "null")')

# ---- fix rounds, verify corrections -----------------------------------------
FR_TOTAL=0; FR_PRS=0; FR_MAX=0; VC=0
for PR in $(printf '%s\n' $PRS | grep . | sort -u); do
  ROUNDS=$(gh pr view "$PR" --json reviews --jq '[.reviews[].body | select(test("## (Spec|Quality): FAIL"))] | length')
  FR_TOTAL=$((FR_TOTAL + ROUNDS)); [ "$ROUNDS" -gt 0 ] && FR_PRS=$((FR_PRS+1)); [ "$ROUNDS" -gt "$FR_MAX" ] && FR_MAX=$ROUNDS
  if gh pr view "$PR" --json body --jq .body | grep -q "Verify block corrected: yes"; then VC=$((VC+1)); fi
done

# ---- edges added (wave comments) --------------------------------------------
EDGES=$(gh api "repos/$EPIC_REPO/issues/$EPIC_N/comments" --paginate \
  --jq '[.[] | select(.body | startswith("<!-- sdd-wave -->")) | .body | capture("Edges added: (?<e>[^\n]*)")? | .e // empty] | map(select(. != "none" and . != "") | split(",") | length) | add // 0')

# ---- panel (integration PR report) ------------------------------------------
PANEL='{"personas":[],"critical":0,"important":0,"minor":0,"dropped":0}'
if [ -n "$INT_PR" ]; then
  REPORT=$(gh pr view "$INT_PR" --json reviews --jq '[.reviews[].body | select(startswith("## Verdict:"))] | last // ""')
  if [ -n "$REPORT" ]; then
    PANEL=$(printf '%s' "$REPORT" | python3 -c '
import sys,re,json
t=sys.stdin.read(); sec=None; c={"Critical":0,"Important":0,"Minor":0}
for line in t.splitlines():
    m=re.match(r"^### (Critical|Important|Minor)",line)
    if m: sec=m.group(1); continue
    if line.startswith("## "): sec=None
    if sec and re.match(r"^- (?:F|#)\d+ ",line): c[sec]+=1
p=re.search(r"Personas: ([^\n]*)",t); d=re.search(r"Dropped below confidence 80: (\d+)",t)
print(json.dumps({"personas":[x.strip().split(" ")[0] for x in p.group(1).split(",")] if p else [],
  "critical":c["Critical"],"important":c["Important"],"minor":c["Minor"],"dropped":int(d.group(1)) if d else 0}))')
  fi
fi

HARNESS="${SDD_HARNESS:-$( { claude --version 2>/dev/null | head -n1 | sed 's/ (Claude Code)//' | sed 's/^/claude-code /'; } || echo unknown)}"
GHV=$(gh --version | head -n1 | awk '{print $3}')

jq -n --arg epic "$EPIC_URL" --argjson total "$TOTAL" --argjson s "$S" --argjson m "$M" --argjson l "$L" --argjson repos "$NREPOS" \
  --argjson ni "$NI" --argjson rh "$RH" --argjson bl "$BL" --argjson edges "$EDGES" \
  --argjson frt "$FR_TOTAL" --argjson frp "$FR_PRS" --argjson frm "$FR_MAX" --argjson vc "$VC" \
  --argjson panel "$PANEL" --argjson med "$MEDIAN" --arg harness "$HARNESS" --arg gh "$GHV" '
{
  schema: "sdd-retro/1", epic: $epic,
  tickets: { total: $total, by_size: { S: $s, M: $m, L: $l }, repos: $repos },
  escalations: { needs_info: $ni, ready_for_human: $rh, blocked: $bl },
  edges_added: $edges,
  fix_rounds: { total: $frt, prs_with_rounds: $frp, max: $frm },
  verify_corrections: $vc,
  panel: $panel,
  cycle: { median_hours_claim_to_pr: $med },
  harness: $harness, gh: $gh
}'
