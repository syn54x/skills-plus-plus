# Incumbent watch

A weekly routine keeps one pinned issue, "Incumbent watch", current with what the projects in [incumbents.md](./incumbents.md) ship. Repo maintenance only: nothing here ships to users, and the routine does not use the `spp` plugin (cloud routines load claude.ai plugins, and claude.ai refuses plugins that carry executables). This file is the whole instruction set. The routine's own prompt only points here.

## Rules

- Never file an issue, open a pull request, or edit any file in the repository. The routine writes two things: the watch issue's body and one comment on it.
- Never add, label, close or assign anything else. The human reads the watch issue and runs `/triage` on any item worth acting on; that is the only way a watch item becomes work.
- Read only the items the delta script prints, plus the one `read` page of an incumbent that has no `repo` (step 3). Do not browse an incumbent's whole history.

## Each run

1. Find the watch issue by its exact title: `gh issue list --state open --search '"Incumbent watch" in:title' --json number,title --jq '[.[] | select(.title == "Incumbent watch")]'`. The search is fuzzy and also matches issues that merely mention the watch, so only the exact-title rows count. Use the issue only when exactly one row remains. With none, or with more than one, stop, say which in the run output, and change nothing: step 5 overwrites a body, so a wrong pick destroys an unrelated issue. Creating and pinning it is a human step (below).
2. Run the delta from the repository root, with the issue number: `node scripts/incumbent-delta.ts --issue <N>`. It prints `{ items, cursor }`, and an `errors` object when `gh` failed for an incumbent. Items are only those newer than the cursor in the issue's data trailer; with no trailer yet, the last 90 days.
3. Read each new item: the release notes at its `url`, or the commit diff for a changelog commit. Open the `read` pages the [watchlist](./incumbents.md) names for that incumbent only when an item touches them. For an incumbent with no `repo` (Cursor), open its `read` page and compare it with that incumbent's section in the current issue body; treat what is not there as new.
4. Tag each new item with one S++ area and a verdict.
   - Areas: `epic path` (grill, spec, tickets, build, review, close), `filed-issue path` (triage and its out-of-scope memory), `wayfinding`, `architecture scans`, `spp CLI`, `skill prose`, `docs`, `plugin packaging`, `harness portability`, `none`.
   - Verdicts: `steal` (spp should adopt the idea, in its own words), `watch` (relevant, but wait for more evidence), `ignore`.
   - Judge against [SCOPE.md](../SCOPE.md): a hypothetical improvement is `watch` at most.
5. Rewrite the issue body in place, with `gh issue edit <N> --body-file <file>`. Keep the last 90 days per incumbent, one section each, newest first: date, title linked to its `url`, area, verdict, and one line on why. Drop entries older than 90 days. Keep an incumbent's earlier entries when its delta is empty. When the delta reports an error for an incumbent, keep its section as it was and add a line `Last run could not read this incumbent: <message>`.
6. End the body with the trailer as its last line: `<!-- sdd-data: <base64 of {"cursor": <the cursor the delta printed>}> -->`. Encode it with `printf '%s' '<json>' | base64 | tr -d '\n'`, and read it back from the API, not from a rendered page, because some harnesses strip HTML comments.
7. Post one short comment: the date, then one line per new item (incumbent, title, area, verdict). If nothing is new, post `Nothing new this week.` and leave the body as it is.

## Human steps

The routine cannot do these, and neither does the pull request that added this file. They happen at cutover (#230).

1. Create the issue. Title `Incumbent watch`, body `Weekly watch of the incumbents in .agents/incumbents.md. The routine rewrites this body.` No labels are required. The label set in `/triage` is not applied; the routine never triages.
2. Pin it: open the issue, then choose Pin issue in the sidebar.
3. Create the routine with `/schedule`, weekly, on `syn54x/skills-plus-plus`, with this one-line prompt: `Follow .agents/incumbent-watch.md.` Give it a `gh` login that can edit issues and comment, and Node 22.18 or later so the script runs without a build.
4. Fallback if the routine is unavailable: a scheduled GitHub Action, added by hand, on a weekly `schedule:` cron plus `workflow_dispatch:`, with `issues: write` permission, that checks out the repository and runs Claude Code headless with the same one-line prompt. It needs a repository secret for the model key. It is a fallback: do not run both at once, or two comments land each week.

## Checking it

The delta is deterministic and tested: `node --test scripts/test/incumbent-delta.test.ts`. A dry run that reads nothing from the issue is `node scripts/incumbent-delta.ts` (no `--issue`), which prints the last 90 days.
