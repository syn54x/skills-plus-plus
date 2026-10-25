#!/usr/bin/env bash
# sync-progress.sh <subcommand> <issue# | issue URL> [...]
# The one writer of the SDD marker comments and the claim mark. For the owned shapes (progress, plan,
# wave) it reads the comment's data trailer, merges the fields passed, and rewrites the whole comment:
# the marker, the rendered lines, then `<!-- sdd-data: <base64 of compact JSON> -->` as the last line.
# `upsert` writes a body file verbatim. Prints the comment URL for comment subcommands, nothing for
# label-only ones. Exit 0 on success, 1 on a gh failure, 2 on usage. See this skill's SKILL.md.
set -euo pipefail

usage() {
  [ $# -eq 0 ] || echo "sync-progress: $*" >&2
  cat >&2 <<'EOF'
usage: sync-progress.sh upsert    <issue> <marker> <body-file>
       sync-progress.sh progress  <issue> [--status in-progress|pr-open|verify-passed|changes-requested|handed-back]
                                          [--worker TEXT] [--branch NAME] [--pr N|URL]
                                          [--verify "not-run" | "passed <sha7>" | "failed <sha7>"] [--notes TEXT]
       sync-progress.sh plan      <issue> [--goal TEXT] [--constraints TEXT] [--branch NAME] [--repos a/b,c/d]
                                          [--narrowed TEXT]... [--add-deviation TEXT] [--table-file FILE]
       sync-progress.sh wave      <issue> add   --n N --tickets 101,owner/repo#7 --workers w1,w2 --started ISO8601
                                                --edges "104<103,owner/repo#7<101" | --edges none
       sync-progress.sh wave      <issue> pr    --ticket 101|owner/repo#7 --pr URL|#n
       sync-progress.sh wave      <issue> panel --round R --verdict "FIX FIRST"|"HUMAN DECISION"|MERGE --report URL
                                                [--severity critical=1,important=2,minor=3] [--persona name=count,...] [--dropped D]
       sync-progress.sh claim     <issue>
       sync-progress.sh unclaim   <issue>
       sync-progress.sh hand-back <issue> needs-info|ready-for-human|blocked --reason TEXT [--blocked-by <issue>]
--blocked-by is optional and goes only with the blocked route, where it adds the blocked-by edge and keeps
ready-for-agent; every other hand-back, blocked without --blocked-by included, removes ready-for-agent.
--narrowed replaces the stored list with every --narrowed of the call; --add-deviation appends.
wave add replaces the wave with the same --n; wave panel replaces the entry with the same --round;
wave pr records the PR on the last wave whose tickets hold --ticket.
<issue> is an issue number in the current repo (GH_REPO, else gh repo view) or a GitHub issue URL.
A wave ticket is a number, owner/repo#N or an issue URL, stored and rendered as given.
EOF
  exit 2
}

# Any gh failure ends the script with 1, also from inside a command substitution.
gh() { command gh "$@" || exit 1; }

need() { [ "$1" -ge 2 ] || usage "$2 needs a value"; }

# A wave ticket or edge side: a bare number, owner/repo#N, or an issue URL (build-epic's multi-repo mode).
TICKET='[0-9]+|[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+#[0-9]+|https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/issues/[0-9]+'

resolve() {
  case "$1" in
    https://github.com/*/*/issues/[0-9]*)
      REPO=$(printf '%s' "$1" | sed -E 's#https://github.com/([^/]+/[^/]+)/issues/.*#\1#')
      NUM=$(printf '%s' "$1" | sed -E 's#.*/issues/([0-9]+).*#\1#') ;;
    ''|*[!0-9]*) usage "<issue> must be an issue number or a GitHub issue URL: $1" ;;
    *) NUM=$1; REPO=${GH_REPO:-$(gh repo view --json nameWithOwner --jq .nameWithOwner)} ;;
  esac
}

# Sets CID and OLD to the id and body of the first comment whose body starts with the marker $1.
find_comment() {
  local hits
  export MARKER=$1  # gh api --jq takes no --arg, so the marker goes in through the environment
  hits=$(gh api "repos/$REPO/issues/$NUM/comments" --paginate \
    --jq '.[] | select(.body | startswith(env.MARKER)) | "\(.id) \(.body | @base64)"')
  hits=${hits%%$'\n'*}
  CID=${hits%% *}; OLD=""
  [ -z "$hits" ] || OLD=$(printf '%s' "${hits#* }" | jq -Rr '@base64d')
}

# Rewrites the found comment with the body file $1, or creates it; prints its URL.
write_comment() {
  if [ -n "$CID" ]; then
    gh api -X PATCH "repos/$REPO/issues/comments/$CID" -F body=@"$1" --jq .html_url
  else
    gh api -X POST "repos/$REPO/issues/$NUM/comments" -F body=@"$1" --jq .html_url
  fi
}

# The decoded data trailer of OLD: {} when it has none (rendered fresh), null when an sdd-data line is
# there but does not decode. CRs are dropped first: a comment edited in the web UI comes back CRLF.
old_data() {
  printf '%s' "$OLD" | jq -Rsc '
    [gsub("\r"; "") | split("\n")[] | select(startswith("<!-- sdd-data:"))] | last
    | if . == null then {}
      else (try (capture("^<!-- sdd-data: (?<d>[A-Za-z0-9+/=]+) -->$").d | @base64d | fromjson) catch null)
        | if type == "object" then . else null end
      end'
}

# PATCH collects the fields a subcommand sets: patch <jq program over PATCH, with $v> [value].
PATCH='{}'
patch() { PATCH=$(jq -c --arg v "${2-}" "$1" <<<"$PATCH"); }

# save <marker> <default data> <jq merge, old data as . and the fields as $p> <jq render, data as .>
# A merge that halts with exit 2 (halt_error(2)) is a usage error; any other jq failure exits 1.
save() {
  local old data rc
  find_comment "$1"
  old=$(old_data)
  if [ "$old" = null ]; then
    echo "sync-progress: $1 on $REPO#$NUM has an sdd-data trailer that does not decode; refusing to overwrite it" >&2
    exit 1
  fi
  data=$(jq -c --argjson d "$2" --argjson p "$PATCH" "\$d + . | $3" <<<"$old") || { rc=$?; [ "$rc" = 2 ] && exit 2; exit 1; }
  {
    printf '%s\n' "$1"
    jq -r "$4" <<<"$data"
    printf '<!-- sdd-data: %s -->\n' "$(jq -r '@base64' <<<"$data")"
  } >"$TMP"
  write_comment "$TMP"
}

PROGRESS_MARKER='<!-- sdd-progress -->'
PROGRESS_DEFAULT='{"status":"in-progress","worker":"","branch":"","pr":null,"verify":{"state":"not-run","sha":""},"route":null,"reason":"","notes":""}'
# Header, five lines, the hand-back line, notes capped at ten lines: the body stays under 20 lines.
PROGRESS_RENDER='
  "**Status:** \(.status)",
  "**Worker:** \(if .worker == "" then "none" else .worker end)",
  "**Branch:** \(if .branch == "" then "none" else "`\(.branch)`" end)",
  "**PR:** \(if .pr == null then "none" elif (.pr | type) == "number" then "#\(.pr)" else .pr end)",
  "**Verify:** \(if .verify.state == "not-run" then "not run" else "\(.verify.state) \(.verify.sha)" end)",
  (select(.status == "handed-back") | "**Handed back:** \(.route): \(.reason | gsub("\n"; " "))"),
  (select(.notes != "") | "", (.notes | split("\n") | .[:10][]))'
save_progress() { save "$PROGRESS_MARKER" "$PROGRESS_DEFAULT" '. + $p' "$PROGRESS_RENDER"; }

cmd_upsert() {
  [ $# -eq 2 ] || usage "upsert takes <issue> <marker> <body-file>"
  [ -f "$2" ] || usage "no body file: $2"
  [ "$(head -n1 "$2")" = "$1" ] || usage "first line of $2 must be the marker $1"
  find_comment "$1"
  write_comment "$2"
}

cmd_progress() {
  while [ $# -gt 0 ]; do
    need $# "$1"
    case "$1" in
      --status)
        case "$2" in
          in-progress|pr-open|verify-passed|changes-requested|handed-back) patch '.status = $v' "$2" ;;
          *) usage "--status must be one of in-progress, pr-open, verify-passed, changes-requested, handed-back" ;;
        esac ;;
      --worker) patch '.worker = $v' "$2" ;;
      --branch) patch '.branch = $v' "$2" ;;
      --pr) patch '.pr = ($v | ltrimstr("#") | if test("^[0-9]+$") then tonumber else $v end)' "$2" ;;
      --verify)
        case "$2" in
          not-run|"not run") patch '.verify = {state: "not-run", sha: ""}' ;;
          "passed "?*|"failed "?*) patch '.verify = ($v | split(" ") | {state: .[0], sha: .[1]})' "$2" ;;
          *) usage '--verify must be "not-run", "passed <sha7>" or "failed <sha7>"' ;;
        esac ;;
      --notes) patch '.notes = $v' "$2" ;;
      *) usage "progress: unknown flag $1" ;;
    esac
    shift 2
  done
  save_progress
}

cmd_plan() {
  while [ $# -gt 0 ]; do
    need $# "$1"
    case "$1" in
      --goal) patch '.goal = $v' "$2" ;;
      --constraints) patch '.constraints = $v' "$2" ;;
      --branch) patch '.branch = $v' "$2" ;;
      --repos) patch '.repos = ($v | split(","))' "$2" ;;
      --narrowed) patch '.narrowed += [$v]' "$2" ;;  # every --narrowed of this call, which replace the stored list
      --add-deviation) patch '.deviated += [$v]' "$2" ;;
      --table-file) [ -f "$2" ] || usage "no table file: $2"; patch '.table = $v' "$(cat "$2")" ;;
      *) usage "plan: unknown flag $1" ;;
    esac
    shift 2
  done
  save '<!-- sdd-plan -->' \
    '{"goal":"","constraints":"","branch":"","repos":[],"narrowed":[],"deviated":[],"table":""}' \
    '. + ($p | del(.deviated)) | .deviated += ($p.deviated // [])' '
    "## Plan", "",
    "**Goal:** \(.goal)",
    "**Constraints:** \(.constraints)",
    (select(.branch != "") | "**Integration branch:** `\(.branch)`"),
    (select(.table != "") | "", (.table | rtrimstr("\n")), ""),
    (select(.repos != []) | "**Repos:** \(.repos | join(", "))"),
    (.narrowed[] | "**Narrowed:** \(.)"),
    (.deviated[] | "**Deviated:** \(.)")'
}

cmd_wave() {
  local op=${1-} merge
  [ $# -gt 0 ] && shift
  local n="" tickets="" workers="" started="" edges="" ticket="" pr="" round="" verdict="" report="" severity="" persona="" dropped=0
  while [ $# -gt 0 ]; do
    need $# "$1"
    case "$op $1" in
      "add --n") n=$2 ;; "add --tickets") tickets=$2 ;; "add --workers") workers=$2 ;;
      "add --started") started=$2 ;; "add --edges") edges=$2 ;;
      "pr --ticket") ticket=$2 ;; "pr --pr") pr=$2 ;;
      "panel --round") round=$2 ;; "panel --verdict") verdict=$2 ;; "panel --report") report=$2 ;;
      "panel --severity") severity=$2 ;; "panel --persona") persona=$2 ;; "panel --dropped") dropped=$2 ;;
      *) usage "wave ${op:-<op>}: unknown flag $1" ;;
    esac
    shift 2
  done
  case "$op" in
    add)
      [[ $n =~ ^[0-9]+$ ]] || usage "wave add needs --n N"
      [[ $tickets =~ ^($TICKET)(,($TICKET))*$ ]] || usage "wave add needs --tickets 101,owner/repo#7,..."
      [ -n "$workers" ] || usage "wave add needs --workers w1,w2"
      [ -n "$started" ] || usage "wave add needs --started ISO8601"
      local edge="($TICKET)<($TICKET)"  # in a variable: a bare < inside [[ ]] is the string comparison
      [[ $edges =~ ^(none|$edge(,$edge)*)$ ]] || usage 'wave add needs --edges "104<103,..." or --edges none'
      PATCH=$(jq -c -n --arg n "$n" --arg t "$tickets" --arg w "$workers" --arg s "$started" --arg e "$edges" \
        '{n: ($n | tonumber), tickets: ($t | split(",")), workers: ($w | split(",")), started: $s,
          edges: (if $e == "none" then [] else $e | split(",") | map(split("<")) end), prs: {}}')
      # A retried add replaces the wave with the same n and keeps the PRs already recorded on it.
      merge='(first(.waves[] | select(.n == $p.n)).prs // {}) as $prs
             | .waves = ([.waves[] | select(.n != $p.n)] + [$p + {prs: $prs}] | sort_by(.n))' ;;
    pr)
      [[ $ticket =~ ^($TICKET)$ ]] || usage "wave pr needs --ticket N|owner/repo#N|URL"
      [ -n "$pr" ] || usage "wave pr needs --pr URL|#n"
      PATCH=$(jq -c -n --arg t "$ticket" --arg pr "$pr" '{ticket: $t, pr: $pr}')
      merge='([.waves | to_entries[] | select(any(.value.tickets[]; tostring == $p.ticket)) | .key] | last) as $i
             | if $i == null then "sync-progress: wave pr: no wave holds ticket \($p.ticket)\n" | halt_error(2)
               else .waves[$i].prs[$p.ticket] = $p.pr end' ;;
    panel)
      [[ $round =~ ^[0-9]+$ ]] || usage "wave panel needs --round R"
      case "$verdict" in "FIX FIRST"|"HUMAN DECISION"|MERGE) ;; *) usage 'wave panel needs --verdict "FIX FIRST"|"HUMAN DECISION"|MERGE' ;; esac
      [ -n "$report" ] || usage "wave panel needs --report URL"
      [[ $severity =~ ^([A-Za-z0-9_-]+=[0-9]+(,[A-Za-z0-9_-]+=[0-9]+)*)?$ ]] || usage "--severity takes name=count,..."
      [[ $persona =~ ^([A-Za-z0-9_-]+=[0-9]+(,[A-Za-z0-9_-]+=[0-9]+)*)?$ ]] || usage "--persona takes name=count,..."
      [[ $dropped =~ ^[0-9]+$ ]] || usage "--dropped takes a count"
      PATCH=$(jq -c -n --arg r "$round" --arg v "$verdict" --arg u "$report" --arg s "$severity" --arg p "$persona" --arg d "$dropped" '
        def counts: if . == "" then {} else split(",") | map(split("=") | {(.[0]): (.[1] | tonumber)}) | add end;
        {round: ($r | tonumber), verdict: $v, report: $u, severity: ($s | counts), persona: ($p | counts), dropped: ($d | tonumber)}')
      # A retried round replaces the entry with the same round.
      merge='.panel = ([.panel[] | select(.round != $p.round)] + [$p] | sort_by(.round))' ;;
    *) usage "wave takes add, pr or panel" ;;
  esac
  # A ticket renders as given, a bare number with "#"; waves written before tickets were strings hold numbers.
  save '<!-- sdd-wave -->' '{"waves":[],"panel":[]}' "$merge" '
    def ref: tostring | if test("^[0-9]+$") then "#\(.)" else . end;
    (.waves[] | "Wave \(.n): \(.tickets | map(ref) | join(", ")) (\(.workers | join(", "))), started \(.started)",
      "Edges added: \(if .edges == [] then "none" else .edges | map("\(.[0]) ← \(.[1])") | join(", ") end)",
      (select(.prs != {}) | "PRs: \(.prs | to_entries | map("\(.key | ref) → \(.value)") | join(", "))")),
    (.panel[] | "Panel round \(.round): \(.verdict) (\(.report))")'
}

cmd_claim() {
  [ $# -eq 0 ] || usage "claim takes only <issue>"
  # Adding a label the repo lacks fails, so create it idempotently first.
  gh label create claimed -R "$REPO" --color FBCA04 \
    --description "Held by a worker; set before work, cleared on stopping without a PR" --force >/dev/null
  gh issue edit "$NUM" -R "$REPO" --add-label claimed >/dev/null
}

cmd_unclaim() {
  [ $# -eq 0 ] || usage "unclaim takes only <issue>"
  gh issue edit "$NUM" -R "$REPO" --remove-label claimed >/dev/null
}

cmd_hand_back() {
  local route=${1-} reason="" blocked_by=""
  case "$route" in needs-info|ready-for-human|blocked) shift ;; *) usage "hand-back needs a route: needs-info, ready-for-human or blocked" ;; esac
  while [ $# -gt 0 ]; do
    need $# "$1"
    case "$1" in
      --reason) reason=$2 ;;
      --blocked-by) blocked_by=$2 ;;
      *) usage "hand-back: unknown flag $1" ;;
    esac
    shift 2
  done
  [ -n "$reason" ] || usage "hand-back needs --reason"
  [ "$route" = blocked ] || [ -z "$blocked_by" ] || usage "--blocked-by goes only with the blocked route"
  # Why first, then the route, then release the claim: a failure part-way leaves the ticket held, never
  # released unrouted. The EXIT trap names the step that failed.
  STEP="1 (progress comment)"
  patch '.status = "handed-back" | .route = $v' "$route"
  patch '.reason = $v' "$reason"
  save_progress
  STEP="2 (route labels)"
  if [ -n "$blocked_by" ]; then
    # The blocked-by edge keeps the ticket out of the ready queue, so ready-for-agent stays for when it clears.
    gh issue edit "$NUM" -R "$REPO" --add-label blocked --add-blocked-by "$blocked_by" >/dev/null
  else
    # ready.sh never reads the blocked label, so an edgeless blocked hand-back must leave the queue too.
    gh issue edit "$NUM" -R "$REPO" --add-label "$route" --remove-label ready-for-agent >/dev/null
  fi
  STEP="3 (clear claimed)"
  gh issue edit "$NUM" -R "$REPO" --remove-label claimed >/dev/null
  STEP=""
}

[ $# -ge 2 ] || usage
SUB=$1; shift
case "$SUB" in upsert|progress|plan|wave|claim|unclaim|hand-back) ;; *) usage "unknown subcommand: $SUB" ;; esac
resolve "$1"; shift
STEP=""
TMP=$(mktemp)
trap 'rc=$?; rm -f "$TMP"; [ "$rc" = 0 ] || [ -z "$STEP" ] || echo "sync-progress: hand-back: step $STEP failed; re-run to finish" >&2' EXIT
case "$SUB" in
  hand-back) cmd_hand_back "$@" ;;
  *) "cmd_$SUB" "$@" ;;
esac
