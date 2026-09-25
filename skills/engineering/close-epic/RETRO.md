# Retro

The retro is a set of counts computed from GitHub state alone, so any host can produce it and no file has to travel. It answers one question: **which step of the workflow was weak on this epic?** Over several epics the trend tells the skills maintainer where to look.

Everything below is `gh` + `jq`. `scripts/sdd-retro.sh` in this skill's base directory does the same thing in one call.

## Inputs

```bash
EPIC_URL=https://github.com/owner/repo/issues/42
EPIC_REPO=$(printf '%s' "$EPIC_URL" | sed -E 's#https://github.com/([^/]+/[^/]+)/issues/.*#\1#')
EPIC_N=${EPIC_URL##*/}
TICKETS=$(gh issue view "$EPIC_URL" --json subIssues --jq '.subIssues.nodes[].url')
```

## Measures

| Measure | Reads | Says something about |
|---|---|---|
| `tickets.total`, `tickets.by_size` | sub-issue labels `size:*` | plan shape |
| `tickets.repos` | distinct `owner/repo` in sub-issue URLs | multi-repo |
| `escalations.needs_info` | timeline `labeled` events for `needs-info` on sub-issues | ticket quality (`to-tickets` SDD pass) |
| `escalations.ready_for_human` | same, `ready-for-human` | worker or reviewer quality |
| `escalations.blocked` | same, `blocked` | plan edges / cross-repo availability |
| `edges_added` | `Edges added:` line in the `<!-- sdd-wave -->` comment on the epic | safety-check misses (`to-tickets` SDD pass, `build-epic` §3) |
| `fix_rounds.total`, `fix_rounds.prs_with_rounds`, `fix_rounds.max` | PR reviews whose body contains `## Spec: FAIL` or `## Quality: FAIL` (`review-pr`) | worker quality vs brief quality |
| `verify_corrections` | PR bodies containing `Verify block corrected: yes` | Verify blocks that lied (`to-tickets` SDD pass) |
| `panel.personas`, `panel.critical`, `panel.important`, `panel.minor`, `panel.dropped` | the `## Verdict:` review on the integration PR (`review-panel` report) | panel calibration |
| `cycle.median_hours_claim_to_pr` | `assigned` event time → PR `createdAt`, per ticket | brief completeness, ticket size |

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

Fix rounds per PR (reviews from `review-pr` carry the two verdict headings):

```bash
PRS=$(for URL in $TICKETS; do gh issue view "$URL" --json closedByPullRequestsReferences --jq '.closedByPullRequestsReferences[].url'; done | sort -u)
for PR in $PRS; do
  gh pr view "$PR" --json reviews --jq '[.reviews[].body | select(test("## (Spec|Quality): FAIL"))] | length'
done
```

Verify corrections:

```bash
for PR in $PRS; do gh pr view "$PR" --json body --jq '.body | test("Verify block corrected: yes") | if . then 1 else 0 end'; done
```

Edges added (the wave comment lists them; `build-epic` writes `Edges added: <consumer> ← <producer>, …` or `Edges added: none`):

```bash
gh api "repos/$EPIC_REPO/issues/$EPIC_N/comments" --paginate \
  --jq '[.[] | select(.body | startswith("<!-- sdd-wave -->")) | .body | capture("Edges added: (?<e>[^\n]*)") | .e] | map(select(. != "none") | split(",") | length) | add // 0'
```

Panel report (the `review-panel` review on the PR to `main`):

```bash
INT_PR=<integration PR url>
gh pr view "$INT_PR" --json reviews --jq '
  [.reviews[].body | select(startswith("## Verdict:"))] | last // "" |
  { personas: (capture("Personas: (?<p>[^\n]*)") .p // "" | split(", ")),
    critical:  ([scan("^- (F|#)\\d+ [^\n]*")] | length),
    dropped:   (capture("Dropped below confidence 80: (?<d>\\d+)") .d // "0" | tonumber) }'
```

(Count Critical / Important / Minor by the heading each `- Fn` line sits under, and `- #n` from reports posted before that id change. The script does this with a small state machine.)

Claim-to-PR hours per ticket:

```bash
for URL in $TICKETS; do
  R=$(repo_of "$URL"); N=${URL##*/}
  CLAIMED=$(gh api "repos/$R/issues/$N/events" --jq '[.[] | select(.event=="assigned")] | first | .created_at // empty')
  OPENED=$(gh issue view "$URL" --json closedByPullRequestsReferences --jq '.closedByPullRequestsReferences[0].url' | xargs -I{} gh pr view {} --json createdAt --jq .createdAt)
  # hours = (OPENED - CLAIMED) / 3600, median across tickets
done
```

## Output

Posted on the epic under `<!-- sdd-retro -->`: a five-row table for humans, then the JSON:

```json
{
  "schema": "sdd-retro/1",
  "epic": "https://github.com/owner/repo/issues/42",
  "tickets": { "total": 6, "by_size": { "S": 2, "M": 3, "L": 1 }, "repos": 2 },
  "escalations": { "needs_info": 1, "ready_for_human": 1, "blocked": 0 },
  "edges_added": 1,
  "fix_rounds": { "total": 3, "prs_with_rounds": 2, "max": 2 },
  "verify_corrections": 2,
  "panel": { "personas": ["correctness", "testing", "maintainability", "standards-and-invariants", "history", "api-contract"], "critical": 0, "important": 2, "minor": 3, "dropped": 4 },
  "cycle": { "median_hours_claim_to_pr": 1.4 },
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
| `escalations.blocked` in a multi-repo epic | cross-repo *Available when* clauses missing |
| `panel.dropped` much larger than findings | persona prompts too eager; raise specificity before raising the gate |
| `cycle` long on S tickets | brief incomplete, or S mis-sized |
