#!/usr/bin/env bash
# sdd-retro.sh <epic url> [--integration-branch <name>] [--integration-pr <pr url>]
# Computes the epic retro from GitHub state and prints the sdd-retro/3 JSON.
# See skills/engineering/close-epic/RETRO.md for what each number means and the portable gh form.
# Best-effort report: no errexit. A measure whose input is missing is null and named in not_found, never 0.
set -uo pipefail

USAGE='usage: sdd-retro.sh <epic url> [--integration-branch <name>] [--integration-pr <pr url>]'
EPIC_URL="${1:?$USAGE}"; shift
BRANCH=""; INT_PR=""
while [ $# -gt 0 ]; do
  case "$1" in
    --integration-branch) BRANCH="${2:?$USAGE}"; shift 2 ;;
    --integration-pr)     INT_PR="${2:?$USAGE}"; shift 2 ;;
    *) echo "$USAGE" >&2; exit 64 ;;
  esac
done

repo_of() { printf '%s' "$1" | sed -E 's#https://github.com/([^/]+/[^/]+)/(issues|pull)/.*#\1#'; }
num_of()  { printf '%s' "${1##*/}"; }
# gh api --paginate prints one JSON array per page; merge them into one array.
api_all() { local out; out=$(gh api "$1" --paginate 2>/dev/null) || out=""; printf '%s' "$out" | jq -s 'add // []' 2>/dev/null || echo '[]'; }
NOT_FOUND=""
not_found() { NOT_FOUND="$NOT_FOUND$1"$'\n'; }
# Marker comments carry `<!-- sdd-data: <base64 of JSON> -->` as their last line (ADR 0007).
# The line grammar is the one in sync-progress SKILL.md's trailer paragraph, shared with the writer.
# decode_trailers <bodies json array> <label> sets DECODED to the array of decoded objects. A trailer line
# that does not match or decode to a JSON object counts as absent and is named "<label> trailer: unreadable".
b64d() { printf '%s' "$1" | base64 -d 2>/dev/null || printf '%s' "$1" | base64 -D 2>/dev/null; }
decode_trailers() {
  DECODED='[]'; local t j
  # "!" stands in for a trailer line that does not match: it never decodes, so it lands on unreadable.
  for t in $(jq -r '.[] | gsub("\r"; "") | [split("\n")[] | select(gsub("^\\s+|\\s+$"; "") | startswith("<!-- sdd-data:"))]
      | last // empty | (sub("\\s+$"; "") | capture("^<!-- sdd-data: (?<t>[A-Za-z0-9+/=]+) -->$").t) // "!"' <<<"$1"); do
    if j=$(b64d "$t" | jq -ce 'select(type=="object")' 2>/dev/null) && [ -n "$j" ]; then
      DECODED=$(jq -c --argjson j "$j" '. + [$j]' <<<"$DECODED")
    else
      not_found "$2 trailer: unreadable"
    fi
  done
}

EPIC_REPO=$(repo_of "$EPIC_URL"); EPIC_N=$(num_of "$EPIC_URL")
TICKETS=$(gh issue view "$EPIC_URL" --json subIssues --jq '.subIssues.nodes[].url' 2>/dev/null)
[ -n "$TICKETS" ] || not_found "sub-issues"

# ---- tickets by size, repos --------------------------------------------------
S=0; M=0; L=0; TOTAL=0; REPOS=""
for URL in $TICKETS; do
  TOTAL=$((TOTAL+1))
  REPOS="$REPOS $(repo_of "$URL")"
  case "$(gh issue view "$URL" --json labels --jq '[.labels[].name | select(startswith("size:"))] | first // ""')" in
    size:S) S=$((S+1));; size:M) M=$((M+1));; size:L) L=$((L+1));;
  esac
done
REPOS=$(printf '%s' "$REPOS" | tr ' ' '\n' | grep . | sort -u)
NREPOS=$(printf '%s\n' "$REPOS" | grep -c .)

# ---- epic comments: plan (integration branch), waves -------------------------
EPIC_COMMENTS=$(api_all "repos/$EPIC_REPO/issues/$EPIC_N/comments")
WAVES=$(jq '[.[] | select(.body | startswith("<!-- sdd-wave -->")) | .body]' <<<"$EPIC_COMMENTS")
PLAN_BODIES=$(jq '[.[] | select(.body | startswith("<!-- sdd-plan -->")) | .body]' <<<"$EPIC_COMMENTS")
decode_trailers "$PLAN_BODIES" plan
[ -n "$BRANCH" ] || BRANCH=$(jq -r '[.[].branch // empty | select(. != "")] | last // empty' <<<"$DECODED")
decode_trailers "$WAVES" wave; WAVE_DATA=$DECODED
if [ -z "$BRANCH" ]; then
  BRANCH=$(jq -r '[.[] | select(.body | startswith("<!-- sdd-plan -->")) | .body
    | capture("\\*\\*Integration branch:\\*\\* *`(?<b>[^`]+)`")? | .b] | last // empty' <<<"$EPIC_COMMENTS")
fi
if [ -z "$BRANCH" ] && [ -n "$INT_PR" ]; then
  BRANCH=$(gh pr view "$INT_PR" --json headRefName --jq .headRefName 2>/dev/null)
fi
if [ -z "$INT_PR" ] && [ -n "$BRANCH" ]; then
  INT_PR=$(gh pr list -R "$EPIC_REPO" --head "$BRANCH" --state all --json url --jq '.[0].url // empty' 2>/dev/null)
fi

# ---- candidate ticket PRs ------------------------------------------------------
# 1. PRs whose base is the integration branch, in every ticket repo.
CANDS='[]'
if [ -n "$BRANCH" ]; then
  for R in $REPOS; do
    LIST=$(gh pr list -R "$R" --base "$BRANCH" --state all --limit 1000 --json url,body 2>/dev/null) || LIST='[]'
    CANDS=$(printf '%s\n%s' "$CANDS" "${LIST:-[]}" | jq -s 'add | unique_by(.url)')
  done
fi
# 2. PRs the wave comments record: the trailer's waves[].prs, then pull URLs, or #N in the epic's repo
#    (issue numbers fail pr view and drop out).
for U in $( { jq -r --arg r "$EPIC_REPO" '.[].waves[]?.prs[]? | if startswith("#") then "https://github.com/\($r)/pull/\(.[1:])" else . end' <<<"$WAVE_DATA"
  jq -r --arg r "$EPIC_REPO" '.[] | ([scan("https://github\\.com/[^/\\s]+/[^/\\s]+/pull/[0-9]+")]
    + [scan("(?<![\\w/])#([0-9]+)") | "https://github.com/\($r)/pull/\(.[0])"]) | .[]' <<<"$WAVES"; } | sort -u); do
  P=$(gh pr view "$U" --json url,body 2>/dev/null) || continue
  [ -n "$P" ] || continue
  CANDS=$(printf '%s\n[%s]' "$CANDS" "$P" | jq -s 'add | unique_by(.url)')
done

# ---- ticket -> PRs: a closing line in the body; closed-by references as fallback -
PRS=""; TICKET_PRS=""
for URL in $TICKETS; do
  R=$(repo_of "$URL"); N=$(num_of "$URL")
  TPRS=$(jq -r --arg r "$R" --arg n "$N" '
    ($r | gsub("\\."; "\\.")) as $re | "(?i)\\b(close[sd]?|fix(e[sd])?|resolve[sd]?):? +" as $kw |
    .[] | (.body // "") as $b | select(
      ($b | test($kw + "(" + $re + "#|https://github\\.com/" + $re + "/issues/)" + $n + "(?![0-9])"))
      or ((.url | startswith("https://github.com/" + $r + "/pull/")) and ($b | test($kw + "#" + $n + "(?![0-9])")))
    ) | .url' <<<"$CANDS")
  if [ -z "$TPRS" ]; then
    TPRS=$(gh issue view "$URL" --json closedByPullRequestsReferences --jq '.closedByPullRequestsReferences[].url' 2>/dev/null)
  fi
  if [ -z "$TPRS" ]; then not_found "ticket PR: $URL"; continue; fi
  PRS="$PRS $TPRS"
  TICKET_PRS="$TICKET_PRS$URL $(printf '%s' "$TPRS" | tr '\n' ' ')"$'\n'
done
PRS=$(printf '%s' "$PRS" | tr ' ' '\n' | grep . | sort -u)

PRDATA='[]'
for PR in $PRS; do
  P=$(gh pr view "$PR" --json url,body,createdAt,reviews 2>/dev/null) || continue
  [ -n "$P" ] && PRDATA=$(printf '%s\n[%s]' "$PRDATA" "$P" | jq -s 'add')
done

# ---- escalations (label events), claim time ---------------------------------
NI=0; RH=0; BL=0; HOURS=""
for URL in $TICKETS; do
  R=$(repo_of "$URL"); N=$(num_of "$URL")
  EV=$(api_all "repos/$R/issues/$N/events")
  NI=$((NI + $(jq '[.[] | select(.event=="labeled" and .label.name=="needs-info")] | length' <<<"$EV")))
  RH=$((RH + $(jq '[.[] | select(.event=="labeled" and .label.name=="ready-for-human")] | length' <<<"$EV")))
  BL=$((BL + $(jq '[.[] | select(.event=="labeled" and .label.name=="blocked")] | length' <<<"$EV")))
  # Claim time: the first `labeled claimed` event, else the first `assigned` (epics built before the mark).
  CLAIMED=$(jq -r '(([.[] | select(.event=="labeled" and .label.name=="claimed")] | first) // ([.[] | select(.event=="assigned")] | first)) | .created_at // empty' <<<"$EV")
  MINE=$(printf '%s' "$TICKET_PRS" | awk -v t="$URL" '$1==t { $1=""; print }')
  OPENED=$(jq -r --arg m "$MINE" '($m | split(" ") | map(select(. != ""))) as $u
    | [.[] | select(.url as $x | $u | index($x)) | .createdAt] | min // empty' <<<"$PRDATA")
  if [ -n "$CLAIMED" ] && [ -n "$OPENED" ]; then
    H=$(python3 -c 'import sys,datetime as d;a,b=[d.datetime.fromisoformat(x.replace("Z","+00:00")) for x in sys.argv[1:]];print(round((b-a).total_seconds()/3600,2))' "$CLAIMED" "$OPENED")
    HOURS="$HOURS $H"
  fi
done
MEDIAN=$(printf '%s' "$HOURS" | tr ' ' '\n' | grep . | python3 -c 'import sys,statistics as s;v=[float(x) for x in sys.stdin.read().split()];print(round(s.median(v),2) if v else "null")')

# ---- fix rounds, verify corrections (null when no ticket PR was found) --------
FIX_ROUNDS=$(jq 'if length == 0 then null else
  map([.reviews[]?.body | select(test("## (Spec|Quality): FAIL"))] | length)
  | { total: add, prs_with_rounds: map(select(. > 0)) | length, max: max } end' <<<"$PRDATA")
# by_cause is null exactly when fix_rounds is; PRs found but no review at all is {}, not null.
BY_CAUSE=null
if [ "$FIX_ROUNDS" != null ]; then
  if BY_CAUSE=$(jq '[.[].reviews[]?.body // ""]' <<<"$PRDATA" | python3 "$(dirname "$0")/sdd-by-cause.py"); then
    [ "$BY_CAUSE" = null ] && BY_CAUSE='{}'
  else
    BY_CAUSE=null; not_found "by_cause counter"   # a crashed counter is not a zero
  fi
fi
VC=$(jq 'if length == 0 then null else map(select((.body // "") | test("Verify block corrected: yes"))) | length end' <<<"$PRDATA")

# ---- edges added (wave comments) --------------------------------------------
if [ "$WAVE_DATA" != '[]' ]; then
  EDGES=$(jq '[.[].waves[]?.edges | length] | add // 0' <<<"$WAVE_DATA")
else
EDGES=$(jq 'if length == 0 then null else
  [.[] | capture("Edges added: (?<e>[^\n]*)")? | .e // empty] | map(select(startswith("none") | not) | [scan("\u2190")] | length) | add // 0 end' <<<"$WAVES")
fi
[ "$EDGES" = null ] && not_found "wave comment"

# ---- panel (every report on the integration PR, reviews and comments) --------
PANEL=null
if [ "$(jq '[.[].panel[]?] | length' <<<"$WAVE_DATA")" -gt 0 ]; then
  # the latest entry per round wins; severity and dropped are summed across rounds
  PANEL=$(jq -c '[.[].panel[]?] | reduce .[] as $r ({}; .[$r.round | tostring] = $r) | [.[]] as $rs | {
    rounds: ($rs | length), personas: (reduce ($rs[].persona // {} | keys_unsorted[]) as $x ([]; if index($x) then . else . + [$x] end)),
    critical: ([$rs[].severity.critical // 0] | add), important: ([$rs[].severity.important // 0] | add),
    minor: ([$rs[].severity.minor // 0] | add), dropped: ([$rs[].dropped // 0] | add)}' <<<"$WAVE_DATA")
elif [ -z "$INT_PR" ]; then
  not_found "integration PR"
else
  RAW=$(gh pr view "$INT_PR" --json reviews,comments 2>/dev/null) || RAW=""
  [ -n "$RAW" ] || RAW='{}'
  REPORTS=$(jq '[(.reviews // [])[] | {body, at: .submittedAt}] + [(.comments // [])[] | {body, at: .createdAt}]
    | map(.body |= ((. // "") | sub("^\\s+"; ""))) | map(select(.body | startswith("## Verdict:")))
    | sort_by(.at) | map(.body)' <<<"$RAW")
  PANEL=$(python3 -c '
import sys,re,json
latest={}
for t in json.load(sys.stdin):   # oldest first, so a re-posted round keeps its latest copy
    m=re.search(r"Round (\d+)", t.splitlines()[0]); latest[int(m.group(1)) if m else 1]=t
if not latest: print("null"); sys.exit()
c={"Critical":0,"Important":0,"Minor":0}; dropped=0; personas=[]
for r in sorted(latest):
    t=latest[r]; sec=None
    for line in t.splitlines():
        m=re.match(r"^### (Critical|Important|Minor)",line)
        if m: sec=m.group(1); continue
        if line.startswith("## "): sec=None
        if sec and re.match(r"^- (?:F|#)\d+ ",line): c[sec]+=1
    p=re.search(r"Personas: ([^\n]*)",t); d=re.search(r"Dropped below confidence 80: (\d+)",t)
    # The list is human prose: it ends at the first ";" or ". " outside parentheses, a parenthetical
    # belongs to the name before it, and a "plus ..." entry is an extra check, not a persona.
    s=p.group(1).rstrip() if p else ""; depth=0; entries=[""]
    for i,ch in enumerate(s):
        if ch=="(": depth+=1
        elif ch==")": depth=max(depth-1,0)
        elif depth==0 and (ch==";" or (ch=="." and s[i+1:i+2] in ("", " "))): break
        if depth==0 and ch==",": entries.append("")
        else: entries[-1]+=ch
    for x in (re.split(r"[ (]",e.strip())[0] for e in entries):
        if x=="plus": break
        if re.fullmatch(r"[a-z0-9-]+",x) and x not in personas: personas.append(x)
    dropped+=int(d.group(1)) if d else 0
print(json.dumps({"rounds":len(latest),"personas":personas,
  "critical":c["Critical"],"important":c["Important"],"minor":c["Minor"],"dropped":dropped}))' <<<"$REPORTS")
  [ "$PANEL" = null ] && not_found "panel report"
fi

HARNESS="${SDD_HARNESS:-$( { claude --version 2>/dev/null | head -n1 | sed 's/ (Claude Code)//' | sed 's/^/claude-code /'; } || echo unknown)}"
GHV=$(gh --version | head -n1 | awk '{print $3}')
NF_JSON=$(printf '%s' "$NOT_FOUND" | jq -R . | jq -s .)

jq -n --arg epic "$EPIC_URL" --argjson total "$TOTAL" --argjson s "$S" --argjson m "$M" --argjson l "$L" --argjson repos "$NREPOS" \
  --argjson ni "$NI" --argjson rh "$RH" --argjson bl "$BL" --argjson edges "$EDGES" \
  --argjson fr "$FIX_ROUNDS" --argjson bc "$BY_CAUSE" --argjson vc "$VC" --argjson panel "$PANEL" --argjson med "$MEDIAN" \
  --argjson nf "$NF_JSON" --arg harness "$HARNESS" --arg gh "$GHV" '
{
  schema: "sdd-retro/3", epic: $epic,
  tickets: { total: $total, by_size: { S: $s, M: $m, L: $l }, repos: $repos },
  escalations: { needs_info: $ni, ready_for_human: $rh, blocked: $bl },
  edges_added: $edges,
  fix_rounds: (if $fr == null then null else $fr + { by_cause: $bc } end),
  verify_corrections: $vc,
  panel: $panel,
  cycle: { median_hours_claim_to_pr: $med },
  not_found: $nf,
  harness: $harness, gh: $gh
}'
