# Retro

The retro is a set of counts computed from GitHub state alone, so any host can produce it and no file has to travel. It answers one question: **which step of the workflow was weak on this epic?** Over several epics the trend tells the skills maintainer where to look.

Everything below is `gh` + `jq`. `scripts/sdd-retro.sh` in this skill's base directory does the same thing in one call.

## Inputs

```bash
EPIC_URL=https://github.com/owner/repo/issues/42
EPIC_REPO=$(printf '%s' "$EPIC_URL" | sed -E 's#https://github.com/([^/]+/[^/]+)/issues/.*#\1#')
EPIC_N=${EPIC_URL##*/}
TICKETS=$(gh issue view "$EPIC_URL" --json subIssues --jq '.subIssues.nodes[].url')
# Marker comments end with `<!-- sdd-data: <base64 of JSON> -->` (ADR 0007). Read the trailer first; a missing
# or undecodable trailer (epics built before it, or a damaged line) falls back to the prose regex. The line
# grammar (CRs dropped, trailing whitespace allowed) is the one in sync-progress SKILL.md's trailer paragraph.
trailer() { jq -r '.[-1:][] | gsub("\r"; "") | [split("\n")[] | select(gsub("^\\s+|\\s+$"; "") | startswith("<!-- sdd-data:"))]
  | last // empty | sub("\\s+$"; "") | capture("^<!-- sdd-data: (?<t>[A-Za-z0-9+/=]+) -->$").t' | base64 -d 2>/dev/null; }
PLAN=$(gh api "repos/$EPIC_REPO/issues/$EPIC_N/comments" --paginate \
  --jq '[.[] | select(.body | startswith("<!-- sdd-plan -->")) | .body]' | trailer)
BRANCH=$(jq -r '.branch // empty' <<<"$PLAN")
[ -n "$BRANCH" ] || BRANCH=$(gh api "repos/$EPIC_REPO/issues/$EPIC_N/comments" --paginate \
  --jq '.[] | select(.body | startswith("<!-- sdd-plan -->")) | .body | capture("\\*\\*Integration branch:\\*\\* *`(?<b>[^`]+)`")? | .b')
INT_PR=$(gh pr list -R "$EPIC_REPO" --head "$BRANCH" --state all --json url --jq '.[0].url')   # the PR to main
```

The plan trailer's `branch` wins; the `**Integration branch:**` line is the fallback. Neither means a one-ticket epic whose PR targets `main`; `BRANCH` and `INT_PR` stay empty.

## Ticket PRs

Every PR-derived measure starts from the ticket-to-PR map. GitHub fills an issue's closed-by references only when a PR merges into the default branch, and slice PRs merge into the integration branch, so those references are the fallback, not the source. Per ticket, its PRs are the first of these that finds any:

1. PRs whose base is `$BRANCH`, in the ticket's repo, whose body carries a closing line for the ticket (`Closes #<N>`, as `implement-issue` writes it; `Fixes` and `Resolves` also match) or a `Refs #<N>` line (a panel fix slice, which refers to its already-closed ticket, as `build-epic` §7 writes it); `owner/repo#<N>` or the issue URL also match.
2. PRs the `<!-- sdd-wave -->` comment records: the trailer's `waves[].prs` values, then any pull URL or `#<n>` in the epic's repo found in its prose, with the same closing or `Refs` line. This catches a slice PR stacked on another slice's branch.
3. The ticket's `closedByPullRequestsReferences`: the one-ticket epic whose PR targets `main`.

A ticket with no PR from any source is listed under `not_found` as `ticket PR: <url>`.

## Missing inputs

A real zero and a missing input look different. A measure whose input does not exist (no ticket PR found at all, no wave comment, no integration PR, no panel report posted yet) is `null` in the JSON and named in `not_found`; the human table prints it as **not found**. A measure computed over some tickets while others had no PR keeps its number, and `not_found` names the tickets it could not see.

## Measures

| Measure | Reads | Says something about |
|---|---|---|
| `tickets.total`, `tickets.by_size` | sub-issue labels `size:*` | plan shape |
| `tickets.repos` | distinct `owner/repo` in sub-issue URLs | multi-repo |
| `escalations.needs_info` | timeline `labeled` events for `needs-info` on sub-issues | ticket quality (`to-tickets` SDD pass) |
| `escalations.ready_for_human` | same, `ready-for-human` | worker or reviewer quality |
| `escalations.blocked` | same, `blocked` | plan edges / cross-repo availability |
| `edges_added` | edge pairs across `waves[].edges` in the wave trailer; else the `Edges added:` lines in the `<!-- sdd-wave -->` comment on the epic (`null` with no wave comment) | safety-check misses (`to-tickets` SDD pass, `build-epic` §3) |
| `fix_rounds.total`, `fix_rounds.prs_with_rounds`, `fix_rounds.max` | reviews on the ticket PRs whose body contains `## Spec: FAIL` or `## Quality: FAIL` (`review-pr`); one review is one round | worker quality vs brief quality |
| `fix_rounds.by_cause` | every finding line (`- Critical`, `- Important`, `- Minor`, any severity) in those FAIL reviews, keyed by its **Law tag** source (`review-pr` §4): a repo path keeps its path with the id dropped (`AGENTS.md`, `ADR-0009`), `ticket` keeps its section (`ticket#Interfaces`), `epic`, `cited`, `skill` and `none` collapse to one key each, an untagged finding counts as `none`; `ADDRESSED` / `NOT ADDRESSED` lines never count; `null` exactly when `fix_rounds` is | which **Law** the fix rounds enforced, and whether the worker had it on the **Laws line** (the skill's §4 cross-check) |
| `verify_corrections` | ticket PR bodies containing `Verify block corrected: yes` | Verify blocks that lied (`to-tickets` SDD pass) |
| `panel.rounds`, `panel.personas`, `panel.critical`, `panel.important`, `panel.minor`, `panel.dropped` | the wave trailer's `panel` rounds; else every `review-panel` report on the integration PR, as a comment or a review: the first report plus each round-marked re-review report | panel calibration |
| `cycle.median_hours_claim_to_pr` | the first `labeled` event for the `claimed` label (else the first `assigned` event, for epics built before the mark) → its earliest ticket PR's `createdAt`, per ticket | brief completeness, ticket size |

## Queries

Escalation events per ticket (sum across tickets):

```bash
repo_of() { printf '%s' "$1" | sed -E 's#https://github.com/([^/]+/[^/]+)/issues/.*#\1#'; }
for URL in $TICKETS; do
  R=$(repo_of "$URL"); N=${URL##*/}
  gh api "repos/$R/issues/$N/events" --paginate \
    --jq '[.[] | select(.event=="labeled") | .label.name] | {needs_info: map(select(.=="needs-info"))|length, ready_for_human: map(select(.=="ready-for-human"))|length, blocked: map(select(.=="blocked"))|length}'
done
```

Ticket PRs (source 1 of the map above; add the wave comment's PRs and, per ticket with no match, its closed-by references):

```bash
PRS=$(for URL in $TICKETS; do
  R=$(repo_of "$URL"); N=${URL##*/}
  gh pr list -R "$R" --base "$BRANCH" --state all --limit 1000 --json url,body |
    jq -r --arg n "$N" '.[] | select(.body | test("(?i)\\b(close[sd]?|fix(e[sd])?|resolve[sd]?|refs?):? +#" + $n + "(?![0-9])")) | .url'
done | sort -u)
```

Fix rounds per PR (reviews from `review-pr` carry the two verdict headings):

```bash
for PR in $PRS; do
  gh pr view "$PR" --json reviews --jq '[.reviews[].body | select(test("## (Spec|Quality): FAIL"))] | length'
done
```

Fix-round findings by cause (every review body on the ticket PRs; `scripts/sdd-by-cause.py` keeps only the FAIL ones, reads stdin, prints the `by_cause` object, and `scripts/sdd-retro-check.sh` checks it against a fixture):

```bash
for PR in $PRS; do gh pr view "$PR" --json reviews --jq '[.reviews[].body]'; done |
  jq -s 'add // []' | python3 scripts/sdd-by-cause.py
```

It prints `null` for an empty array; with ticket PRs found but no review on any of them, write `{}`, so `by_cause` is `null` exactly when `fix_rounds` is. The helper takes the array of review bodies that the `jq -s 'add // []'` line builds, never the retro JSON: anything else exits 2 with one line on stderr and nothing on stdout, because a wrong shape would otherwise print the same `{}` as "no failing review". The skill's Laws-line cross-check reads `by_cause` from the retro output rather than re-running the helper.

Verify corrections:

```bash
for PR in $PRS; do gh pr view "$PR" --json body --jq '.body | test("Verify block corrected: yes") | if . then 1 else 0 end'; done
```

Edges added (the wave trailer's `waves[].edges` lists them, an empty list counting zero; `sync-progress` renders the same pairs as `Edges added: <consumer> ← <producer>, …` or `Edges added: none`). Trailer first, prose when there is none. The prose line may carry more after the list (`none. Files owned amended: ...`), so a value that begins with `none` is zero and any other counts its `←` pairs, not its commas:

```bash
WAVE=$(gh api "repos/$EPIC_REPO/issues/$EPIC_N/comments" --paginate \
  --jq '[.[] | select(.body | startswith("<!-- sdd-wave -->")) | .body]' | trailer)
[ -n "$WAVE" ] && jq '[.waves[].edges | length] | add // 0' <<<"$WAVE" ||
gh api "repos/$EPIC_REPO/issues/$EPIC_N/comments" --paginate \
  --jq '[.[] | select(.body | startswith("<!-- sdd-wave -->")) | .body | capture("Edges added: (?<e>[^\n]*)") | .e] | map(select(startswith("none") | not) | [scan("\u2190")] | length) | add // 0'
```

Panel, from the wave trailer when it has `panel` rounds: the latest entry per `round` counts as that round; `panel.rounds` is how many distinct rounds, `critical`, `important`, `minor` and `dropped` sum `severity` and `dropped` across them, and `personas` lists the keys of every round's `persona` map. With none, the report comments below are the fallback. A trailer that does not decode is treated as absent and named in `not_found` as `wave trailer: unreadable` (`plan trailer: unreadable` for the plan).

Panel reports (`review-panel` posts its report as a PR comment once the user says to; older runs posted a review, so read both):

```bash
gh pr view "$INT_PR" --json reviews,comments --jq '
  [(.reviews[] | {body, at: .submittedAt}), (.comments[] | {body, at: .createdAt})]
  | map(select(.body | startswith("## Verdict:"))) | sort_by(.at) | map(.body)'
```

Each report is one **round**: the first report has no marker and is round 1; a re-review report after a FIX FIRST fix round carries `Round 2` or `Round 3` on its `## Verdict:` line. When the same round was posted twice, keep the latest copy. `panel.rounds` counts the rounds; `critical`, `important`, `minor` and `dropped` sum across them (a re-review report lists only its new findings, so nothing counts twice); `personas` is the union of each report's `Personas:` list. That line is prose, so the list ends at the first `;` or `. ` outside parentheses, a parenthetical belongs to the name before it, an entry starting `plus` ends it, and each remaining comma-separated entry gives its first word when that word is a lowercase identifier (`a-z`, digits, hyphens). Count Critical / Important / Minor by the heading each `- Fn` line sits under, and `- #n` from reports posted before that id change. The script does this with a small state machine. No report → `panel: null`.

Claim-to-PR hours per ticket:

```bash
for URL in $TICKETS; do
  R=$(repo_of "$URL"); N=${URL##*/}
  # the first `labeled claimed` event, else the first `assigned` event (epics built before the mark)
  CLAIMED=$(gh api "repos/$R/issues/$N/events" --jq '(([.[] | select(.event=="labeled" and .label.name=="claimed")] | first) // ([.[] | select(.event=="assigned")] | first)) | .created_at // empty')
  OPENED=<earliest createdAt among this ticket's PRs from the map>
  # hours = (OPENED - CLAIMED) / 3600, median across tickets
done
```

## Output

Posted on the epic under `<!-- sdd-retro -->`: a five-row table for humans, then the JSON. In the table a `null` measure reads **not found**, a panel of more than one round reads `panel (N rounds)` with its summed counts, and the fix-rounds row lists `by_cause` with its keys as written (`AGENTS.md 2 · ticket#Interfaces 1 · epic 1`). A retro posted as `sdd-retro/2` simply lacks the key.

```json
{
  "schema": "sdd-retro/3",
  "epic": "https://github.com/owner/repo/issues/42",
  "tickets": { "total": 6, "by_size": { "S": 2, "M": 3, "L": 1 }, "repos": 2 },
  "escalations": { "needs_info": 1, "ready_for_human": 1, "blocked": 0 },
  "edges_added": 1,
  "fix_rounds": { "total": 3, "prs_with_rounds": 2, "max": 2,
    "by_cause": { "AGENTS.md": 2, "ADR-0009": 1, "ticket#Interfaces": 1, "epic": 1, "skill": 1, "none": 2 } },
  "verify_corrections": 2,
  "panel": { "rounds": 2, "personas": ["correctness", "testing", "maintainability", "standards-and-invariants", "history", "api-contract"], "critical": 0, "important": 2, "minor": 3, "dropped": 4 },
  "cycle": { "median_hours_claim_to_pr": 1.4 },
  "not_found": [],
  "harness": "claude-code 2.1.280", "gh": "2.98.0"
}
```

This block is the **local** retro. It names the epic and stays in the user's repo. The upstream feedback body (see `skill-feedback.md`) copies only the counts, never `epic`.

## Reading it

| Symptom | Likely weak step |
|---|---|
| `verify_corrections` high | `to-tickets` SDD §1: Verify blocks written without running them |
| `escalations.needs_info` high | `to-tickets` SDD §1 placeholder gate, or `to-spec` leaving decisions open |
| `edges_added` high | `to-tickets` SDD §1 / `build-epic` parallel safety check missed interface pairs |
| `fix_rounds.max` ≥ 2 on several PRs | worker brief or tier rubric (`build-epic` §4–5), or `review-pr` calibration |
| `by_cause` repo-path keys high | `implement-issue` §4 and §6: the Laws were read but not checked, at their trigger or in the self-review; or, when the Law states no trigger, the Law's own wording |
| `by_cause` has a repo-path key that is not on the Laws line | the Laws line itself (`setup-syn54x-skills` Section D): the worker was never told to read that file |
| `by_cause` `ticket#Interfaces` high | `implement-issue` §6: the Interfaces claim, the diff's public symbols matched against the Produces lines |
| `by_cause` `ticket#Test scenarios` high | `to-tickets` SDD §1: scenarios that a worker could not map one test to each |
| `by_cause` `epic` high | the ticket did not carry the epic's decision (`to-tickets` consistency pass, the brief's Laws section) |
| `by_cause` `skill` high | `implement-issue` itself, the step the tag names (§6 Laws lines, §7 PR body claims): the rule was read and not followed. File it as skill feedback for this repository (category `law-read-not-checked`), not as a fix in the user's repo |
| `by_cause` `none` high | logic and test gaps no Law names: the tier rubric (`build-epic` §4–5), or `review-pr` calibration |
| `escalations.blocked` in a multi-repo epic | cross-repo *Available when* clauses missing |
| `panel.dropped` much larger than findings | persona prompts too eager; raise specificity before raising the gate |
| `panel.rounds` ≥ 2 on several epics | slices that pass their own gate but break where they meet: `review-pr` Coherence, or the plan's interface edges |
| `cycle` long on S tickets | brief incomplete, or S mis-sized |
