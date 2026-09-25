---
name: build-epic
description: Orchestrate an epic issue to completion. Computes the ready queue from native sub-issue and blocked-by links, dispatches isolated workers in waves of 3–5, gates every PR with a fresh reviewer, merges in dependency order, then panel-reviews the PR to main and closes the epic. For size M/L epics; pass --workflow for XL.
disable-model-invocation: true
---

# Build Epic

You are the **orchestrator**. You read issues, compute the frontier, brief and dispatch workers, gate their PRs, and keep the epic's bookkeeping honest. You never edit source. Everything you know about the work comes from GitHub, not from this conversation, so a fresh session can pick up where you stopped.

Usage: `/build-epic <epic#> [--max-workers N] [--workflow]`

## 0. Preflight

```bash
EPIC=42
gh --version                                          # 2.94+
gh issue view "$EPIC" --json number,title,state,labels,subIssuesSummary
gh api "repos/$(gh repo view --json nameWithOwner --jq .nameWithOwner)/issues/$EPIC/comments" --paginate \
  --jq '[.[] | select(.body | startswith("<!-- sdd-plan -->"))] | length'
```

Stop and say why if: the epic is closed; it has no sub-issues (tell the user to run `/to-tickets <epic#>` first); the plan comment is missing (same fix); or the routing block from `/setup-syn54x-skills` is absent from `CLAUDE.md`/`AGENTS.md`.

**Which repos?** Sub-issues may live in more than one repo (a frontend epic with backend tickets):

```bash
gh issue view "$EPIC" --json subIssues --jq '[.subIssues.nodes[].repository.nameWithOwner] | unique'
```

More than one → **multi-repo mode**. You need a local checkout of every repo listed. Default: sibling directories named after the repo (`../pinch-backend` next to `../pinch-frontend`); if one is missing, ask for its path or clone it. Every repo must have run `/setup-syn54x-skills` (labels, routing block). From here on, identify tickets by **URL**, never by bare number: `gh issue view`, `gh issue edit` and `gh pr view` all accept URLs, and a bare `#12` is ambiguous across repos.

Read the plan comment and the epic body once. Read each repo's laws (`CLAUDE.md`, `AGENTS.md`, `CONTEXT.md`, ADRs) once. You should be able to write every brief without opening another file.

## 1. Integration branch

```bash
BRANCH="feat/$(gh issue view "$EPIC" --json title --jq '.title | ascii_downcase | gsub("[^a-z0-9]+";"-") | .[0:40]')"
git fetch origin
git switch -c "$BRANCH" origin/main 2>/dev/null || git switch "$BRANCH"
git push -u origin "$BRANCH"
```

Every worker PR targets this branch. You merge into it. When the epic is done, one PR takes it to `main` and that merge is the user's. A one-ticket epic (size M standalone) may skip the integration branch and target `main`; then the final merge is also the user's.

**Multi-repo:** one integration branch **per repo that has a sub-issue**, same name in each, created from that repo's default branch inside its checkout (`git -C ../pinch-backend switch -c "$BRANCH" origin/main`). A brief never crosses a repo boundary: a worker gets one ticket in one repo.

Record the branch name (and, in multi-repo mode, the list of repos) in the plan comment if it is not there.

## 2. Ready queue

Readiness is **derived**, never read from a status label: open, every blocker closed, unassigned, labelled `ready-for-agent`.

```bash
for URL in $(gh issue view "$EPIC" --json subIssues --jq '.subIssues.nodes[] | select(.state=="OPEN") | .url'); do
  gh issue view "$URL" --json number,title,url,body,labels,assignees,blockedBy \
    --jq 'select((.assignees|length)==0)
        | select([.labels[].name] | index("ready-for-agent"))
        | select(([.blockedBy.nodes[] | select(.state=="OPEN")] | length)==0)
        | {number,title,url,size:([.labels[].name] | map(select(startswith("size:"))) | first // "size:?")}'
done
```

The URL carries the repo, so this loop is the same in single- and multi-repo mode.

Tickets that are open but still blocked form the later layers; tickets assigned to someone are in flight; tickets without `ready-for-agent` are not yours. If the queue is empty and nothing is in flight but sub-issues remain open, the plan has a cycle or a missing label: report it and stop.

`scripts/ready.sh <epic#>` in this skill's base directory prints the same queue as JSON, and `scripts/ready.sh <epic#> --all | python3 scripts/layers.py` prints the layers. The loop above is the form to fall back on when the scripts are not at hand.

## 3. Parallel safety check

Before a wave, run the check in [PARALLEL-SAFETY-CHECK.md](./PARALLEL-SAFETY-CHECK.md) over the ready tickets' **Files owned** and **Interfaces**. Two ready tickets that touch the same file, the same migration series, a shared lockfile or a producer/consumer interface pair do not run together: add the missing `--add-blocked-by` edge (and note it in the plan comment) or pick one for this wave and hold the other. File overlap is checked **per repo**; interface pairs are checked **across repos** too, since an API route produced in the backend and consumed in the frontend is the commonest cross-repo edge.

## 4. Wave plan, then approval

Present the wave as chat text, one table: ticket → size → tier → files owned → held-back reason (if any). Tier by task shape, never by vendor model name: mid tier for a well-specified, single-subsystem ticket with an in-repo pattern to imitate; ceiling tier for cross-cutting, schema, or design-judgment work, and for any ticket that already bounced once.

Wait for approval on the **first** wave. Later waves that follow the plan launch without a fresh ask; a re-bundle, a new edge or a tier change comes back for review. Max workers per wave: `--max-workers`, default 4, never more than 5.

## 5. Claim and dispatch

For each ticket in the wave:

1. Claim: `gh issue edit "$N" --add-assignee @me`.
2. Write the brief from [WORKER-BRIEF.md](./WORKER-BRIEF.md). The brief is the ticket body verbatim plus the laws, the branch mechanics, and the report format. Workers get nothing from this conversation, so the brief is complete or the worker fails.
3. Dispatch the brief to **one isolated worker per ticket, in its own worktree of that ticket's repo, branched from that repo's integration branch, with the whole wave running concurrently**. The concrete call depends on the harness: see [HARNESS-DISPATCH.md](./HARNESS-DISPATCH.md). The worker calls the Skill tool with "implement-issue" for the ticket's URL, inside that worktree. In multi-repo mode the brief names the checkout the worker starts from; a worker never guesses which repo a ticket belongs to.

Then upsert the wave comment on the epic under `<!-- sdd-wave -->` (call the Skill tool with "sync-progress" for the upsert): wave number, tickets, worker names, started-at, and one line `Edges added: <consumer> ← <producer>, …` or `Edges added: none` listing every `--add-blocked-by` the safety check introduced since the plan comment. `close-epic`'s retro reads that line.

### Heartbeat

While workers run, report one line per worker whenever you surface: ticket → last known state (from the issue's progress comment, pushed refs, open PRs, or the harness's agent list). Never read a worker's transcript; never invent a state. A worker with no signal is "no update since dispatch".

## 6. Gate each PR

First read the worker's status; never ignore an escalation, and never re-run the same worker unchanged:

- `DONE_WITH_CONCERNS` → read the concerns. Correctness or scope doubts get resolved (answer, or send the worker back) before review; observations are noted and review proceeds.
- `NEEDS_CONTEXT` → supply the missing context and resume the worker.
- `BLOCKED` → decide what changes: more context (resume), more capability (fresh dispatch on the ceiling tier), a smaller ticket (split it, new sub-issues, edges), or a wrong plan (fix the ticket body, record the ruling in the plan comment, re-dispatch).

Then call the Skill tool with "review-pr" for its PR. That skill dispatches a fresh reviewer, runs the ticket's Verify block, and returns two verdicts: **spec** and **quality**, with severities.

- Both pass → merge into the integration branch under the project's merge law (squash unless the law says otherwise). The merge closes the sub-issue via `Closes #N`.
- Either fails → the Critical and Important findings go back to the **same worker** (resume it by name; it holds the context). One fix round, then a scoped re-review.
- Findings still open → either one fresh dispatch on the ceiling tier carrying the brief, the PR and the open findings, or straight to `ready-for-human`: label it, unclaim, leave the PR open, move on. Do not fix it yourself beyond a trivial mechanical nit.

**Merging.** Merge in dependency order, one PR at a time. If a merge conflicts, abort it (`git merge --abort` or close the attempt), do not hand-resolve: silently picking a side discards one ticket's intent. Instead resume that worker with "rebase onto the current integration branch and re-run Verify", then re-gate. After each merge, run the merged ticket's Verify block (or the repo's suite if the law names one) on the integration branch before merging the next; a red tree stops the wave until it is diagnosed.

Merges move the frontier. After each merge, recompute the ready queue (step 2) and dispatch the newly unblocked tickets as the next wave.

**Cross-repo blockers.** A ticket blocked by a ticket in another repo is ready only when the blocking PR is merged onto **that repo's** integration branch **and** whatever the consumer needs from it actually exists: the OpenAPI spec published, the client regenerated, the preview environment or local backend running the new route, e2e pointed at it. The GitHub link closing is not the gate; the brief for the consumer names what must be available, and you check it before dispatch.

## 7. Close-out

When every sub-issue is closed, open the integration-branch PR to `main` and call the Skill tool with "review-panel" for it: it runs `review-pr`'s spec and Coherence verdicts and a persona panel (correctness, testing, maintainability, standards and invariants, history, plus the conditionals the diff warrants), and posts one report once the user approves it. **FIX FIRST** → route the findings to the owning workers by `Files owned`, one fix round, scoped re-review. Otherwise hand the merge to the user with the report. You do not merge to `main`.

Once the user has merged the PR to `main` (every repo's, in a multi-repo epic), call the Skill tool with "close-epic" for the epic: it posts the summary comment, the retro and the `## Learnings` (candidate ADRs and terminology drift from the panel report go there), and closes the epic. It refuses to close an epic whose PR to `main` has not merged, so never run it earlier. If the session ends before the user merges, say so in the report: `close-epic` can run in any later session, from GitHub state alone.

**Multi-repo:** one integration-branch PR **per repo**, each gated with `review-panel`, handed to the user in dependency order (usually backend before frontend, so the API exists before the UI that calls it lands). Say explicitly which merges depend on which.

Report with one table: ticket → tier → PR → state (merged / ready-for-human / open), plus anything cut, deferred, or edited in the plan.

## Escalation: `--workflow`

More than ~8 independent tickets, or the user wants scripted verify → merge ordering, is XL work. Instead of dispatching by hand, emit a dynamic-workflow script from [WORKFLOW-TEMPLATE.js](./WORKFLOW-TEMPLATE.js), filled in with the epic's tickets and layers, and run it on a harness that has one (Claude Code: the `Workflow` tool; the user must opt in with "ultracode" or "run a workflow"). The script performs steps 5–6 per layer; you still do steps 0–4 and 7.

## Guardrails

- Readiness comes from links and assignees, never from a status label.
- Every comment you write sits under a marker and is rewritten in place.
- One team primitive per session: worktree waves and Agent Teams are mutually exclusive. This skill uses worktree waves; leave the Agent Teams flag unset.
- You do not write code. You do not merge to `main`.
- In multi-repo mode, tickets are URLs, briefs are single-repo, and a cross-repo blocker is cleared by availability, not by a closed link.
