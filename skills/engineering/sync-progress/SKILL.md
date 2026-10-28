---
name: sync-progress
description: Write an SDD marker comment on a GitHub issue (progress, plan, wave, or a raw upsert), claim or unclaim the issue with the claim mark, or hand a sub-issue back (route label, clear the claim, reason on the progress comment) in one call. Use when an SDD skill records status on a sub-issue or epic (sdd-progress, sdd-plan, sdd-wave, sdd-summary, sdd-retro) without posting a second comment, or when a worker stops without a PR or a gate routes a sub-issue back.
---

# Sync Progress

One issue, one comment per marker, rewritten in place and never appended. Every write goes through one script, `scripts/sync-progress.sh` in this skill's base directory: you name the comment and the fields you set, and it reads the existing **Marker comment**, merges, renders the human lines and stores the state in a data trailer on the last line. You never write the body of an owned comment yourself, and you never read its fields from the rendered lines.

```bash
S=<this skill's base directory>/scripts/sync-progress.sh
"$S" progress 103 --status in-progress --worker sdd-worker-1 --branch sdd/103-invoice-endpoint
```

`<issue>` is an issue number in the current repo (`GH_REPO` when set, else `gh repo view`) or a GitHub issue URL; use the URL whenever the epic spans repos. The comment subcommands print the comment's URL; `claim` and `unclaim` print nothing. Exit 0 on success, 1 on a `gh` failure or a trailer that does not decode, 2 on usage (unknown subcommand, missing or malformed flag, a `wave pr` ticket no wave holds), with the reason on stderr.

## Markers

| Marker | Lives on | Written by | Shape |
|---|---|---|---|
| `<!-- sdd-progress -->` | a sub-issue | `implement-issue`, `review-pr` | owned: `progress`, `hand-back` |
| `<!-- sdd-plan -->` | the epic | `to-tickets` (SDD pass), `build-epic` | owned: `plan` |
| `<!-- sdd-wave -->` | the epic | `build-epic`, `review-panel` | owned: `wave add\|pr\|panel` |
| `<!-- sdd-summary -->` | the epic | `close-epic` | raw: `upsert` |
| `<!-- sdd-retro -->` | the epic | `close-epic` (numbers from GitHub state; stays in the repo) | raw: `upsert` |
| `<!-- sdd-feedback-draft -->` | the epic (one comment holding every draft) | `close-epic`, only when nobody can approve an upstream filing | raw: `upsert` |

The marker is the **first line** of the comment body; nothing else identifies the comment. An owned comment's **last line** is `<!-- sdd-data: <base64 of compact JSON> -->`. Base64 because `--` ends an HTML comment and reasons carry flags like `--add-blocked-by`. To read an owned comment's fields, fetch the comment through `gh api` and decode that line; some harnesses strip HTML comments from the context they hand a model, so never read a marker or trailer from that context.

The trailer line grammar is stated here once; this script and `close-epic`'s retro both read by it. Drop every carriage return (a comment edited in the web UI comes back CRLF). The trailer is the last line that, trimmed at both ends, starts with `<!-- sdd-data:`; a body with no such line has no trailer. That line must then match `<!-- sdd-data: <base64> -->` exactly, trailing whitespace aside, so a leading space or anything else on the line fails. A trailer that fails the match, the base64 decode, or the parse as a JSON object **does not decode**: this script exits 1, naming the marker and the issue, and writes nothing, because rendering fresh would erase the state; the retro treats it as absent and names it in `not_found` as `wave trailer: unreadable` or `plan trailer: unreadable`.

## Subcommands

```text
sync-progress.sh upsert    <issue> <marker> <body-file>
sync-progress.sh progress  <issue> [--status in-progress|pr-open|verify-passed|changes-requested|handed-back]
                                   [--worker TEXT] [--branch NAME] [--pr N|URL]
                                   [--verify "not-run" | "passed <sha7>" | "failed <sha7>"] [--notes TEXT]
sync-progress.sh plan      <issue> [--goal TEXT] [--constraints TEXT] [--branch NAME] [--repos a/b,c/d]
                                   [--narrowed TEXT]... | [--narrowed none] [--add-deviation TEXT] [--table-file FILE]
sync-progress.sh wave      <issue> add   --n N --tickets 101,owner/repo#7 --workers w1,w2 --started ISO8601
                                         --edges "104<103,owner/repo#7<101" | --edges none
sync-progress.sh wave      <issue> pr    --ticket 101|owner/repo#7 --pr URL|#n
sync-progress.sh wave      <issue> panel --round R --verdict "FIX FIRST"|"HUMAN DECISION"|MERGE --report URL
                                         [--severity critical=1,important=2,minor=3] [--persona name=count,...] [--dropped D]
sync-progress.sh claim     <issue>
sync-progress.sh unclaim   <issue>
sync-progress.sh hand-back <issue> needs-info|ready-for-human|blocked --reason TEXT [--blocked-by <issue>]
```

`--blocked-by` is optional and goes only with the `blocked` route; on `needs-info` or `ready-for-human` it is a usage error (exit 2).

Merge rules for the owned shapes:

- A field you do not pass keeps its previous value, so pass only what changed: `progress 103 --status pr-open --pr 57 --verify "passed abc1234"` keeps the Worker and Branch.
- `--add-deviation` appends to the plan's Deviated list. `--narrowed` replaces the Narrowed list with every `--narrowed` on the call, so re-pinning the plan never duplicates a line and a withdrawn narrowing drops. A call with no `--narrowed` keeps the stored list, so a caller that re-pins a plan with no narrowings left (`to-tickets` re-running its SDD pass, say) passes `--narrowed none`, which clears it.
- `wave add` adds a wave, or replaces every wave with the same `--n` (keeping the PRs recorded on any of them); `wave panel` adds a round, or replaces the one with the same `--round`. A retried call therefore never duplicates an entry, and the retro's edge count stays right.
- `wave pr` sets the PR of the named ticket on the last wave whose tickets hold it; a ticket no wave holds is a usage error.
- A comment with no trailer (written before this script) is rendered fresh from the fields you pass; nothing else of the old prose survives.
- `upsert` is for the one-writer comments only. The body file's first line must be the marker; it is written verbatim, with no trailer.

## Progress comment

Data, as the trailer stores it:

```json
{"status":"in-progress","worker":"","branch":"","pr":null,
 "verify":{"state":"not-run","sha":""},"route":null,"reason":"","notes":""}
```

Rendered:

```markdown
<!-- sdd-progress -->
**Status:** in-progress | pr-open | verify-passed | changes-requested | handed-back
**Worker:** <agent name locally, login for a human>
**Branch:** `sdd/<N>-<slug>`
**PR:** #<n> | none
**Verify:** not run | passed <sha7> | failed <sha7>
**Handed back:** <route>: <reason>          (only when the status is handed-back)

<--notes: one to five lines on what is done, what is next, what the reviewer should know>
<!-- sdd-data: … -->
```

The rendered body stays under 20 lines (notes past ten lines stay in the data only). Detail belongs in the PR, not the issue.

## Plan comment

Data: `{"goal":"","constraints":"","branch":"","repos":[],"narrowed":[],"deviated":[],"table":""}`. Rendered: `## Plan`, `**Goal:**`, `**Constraints:**`, `**Integration branch:** \`<branch>\`` (omitted when empty), the `--table-file` contents verbatim, `**Repos:**` (omitted when empty), then one `**Narrowed:** …` line per narrowing and one `**Deviated:** …` line per **Interface deviation**, each omitted when empty. `close-epic`'s retro reads the Integration branch line, and reviewers read Narrowed and Deviated.

## Wave comment

One wave comment per epic; waves and panel rounds are lists inside its data:

```json
{"waves":[{"n":1,"tickets":["101","acme/api#7"],"workers":["w1","w2"],"started":"2026-10-25T09:00:00Z",
           "edges":[["acme/api#7","101"]],"prs":{"101":"https://github.com/o/r/pull/9"}}],
 "panel":[{"round":1,"verdict":"MERGE","report":"https://…","severity":{"critical":0,"important":1,"minor":2},
           "persona":{"correctness":1},"dropped":0}]}
```

A ticket, and each side of an edge, is a bare number, `owner/repo#N` or an issue URL, so `build-epic`'s multi-repo mode records its cross-repo tickets; each is stored as the string given, and `prs` is keyed by that same string. `wave pr --ticket` matches that stored string, so pass it in exactly the form given to `wave add` (the `owner/repo#N` or issue URL in multi-repo mode): a bare `7` matches neither `acme/api#7` nor its URL. Waves written before tickets were strings hold numbers, which render the same.

Rendered, per wave: `Wave <n>: #101, acme/api#7 (w1, w2), started <ISO>` (a bare number gains `#`, anything else renders as given), `Edges added: acme/api#7 ← 101, …` or `Edges added: none`, and `PRs: #101 → <url>, …` once a PR is recorded; then per panel round `Panel round <r>: <VERDICT> (<report>)`. `--edges` lists every `--add-blocked-by` the safety check introduced since the plan comment, as `consumer<producer`.

## Claim and unclaim

The claim is a **Claim mark**: the label `claimed`, never an assignee. `claim` creates the label idempotently (`gh label create claimed --force`, because adding a label the repo lacks fails) and adds it; `unclaim` removes it.

A ticket is **held** when it carries the `claimed` label or an assignee. A held ticket is out of the ready queue, so **claim before any work starts**, and when you stop without a PR, **hand back** (below) rather than only unclaiming. Agents write only the mark, never an assignee, and a human's self-assignment counts as held. Never claim a ticket that is already held, whether by another worker's mark or a person's assignment; report it instead. The holder's name lives in the progress comment's **Worker** line.

## Hand-back

A **Hand-back** is any SDD skill returning a sub-issue to a person or a queue: a worker stopping without a PR, a gate (`review-pr`, `build-epic`) routing one whose PR stays open, or `build-epic`'s safety check returning an unclaimed ticket that has no PR yet. It is one call, with the reason:

```bash
"$S" hand-back 103 needs-info --reason "ticket cites src/billing/tax.ts, which does not exist"
```

| Situation | Route | Labels | Also |
|---|---|---|---|
| The ticket is ambiguous or contradicts the code | `needs-info` | adds `needs-info`, removes `ready-for-agent` | |
| A human decision or secret is needed | `ready-for-human` | adds `ready-for-human`, removes `ready-for-agent` | |
| A blocker the tracker does not know about, named | `blocked` with `--blocked-by <issue>` | adds `blocked`, keeps `ready-for-agent` | adds the native blocked-by edge, which keeps the ticket out of the ready queue until the blocker closes |
| A blocker the tracker does not know about, unnamed | `blocked` | adds `blocked`, removes `ready-for-agent` | `ready.sh` never reads the `blocked` label, so without an edge the ticket must leave the queue by label or it is re-dispatched every wave |

Pass `--blocked-by` whenever you know the blocker; it is refused on the other two routes.

The call writes in this order: the progress comment first (status `handed-back`, rendered as `**Handed back:** <route>: <reason>`), then the route labels, then it removes `claimed`. A failure part-way leaves the ticket held, never released without a route, and prints `sync-progress: hand-back: step <n> (<what>) failed; re-run to finish`; re-running the same call finishes it. A progress comment whose trailer does not decode stops the call at step 1 with only the trailer message and no re-run hint, since a re-run refuses the same way: repair the comment first with `upsert` (a body that starts with the marker and carries no trailer), then re-run the hand-back, which renders the comment fresh. The reason may carry anything, `--` included.
