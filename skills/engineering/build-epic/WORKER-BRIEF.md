# Worker brief

The brief is the **only** context a worker gets. Conversation history, the plan comment, the other tickets: none of it reaches the worker unless it is in the brief. Fill every slot; a brief with a blank is not dispatched.

```markdown
You are worker-<N>, implementing sub-issue <issue URL> of epic <epic URL>.
Start in the checkout at <absolute path of this ticket's repo>; the ticket, its branch and its PR all live in <owner/repo> and nowhere else.
First, before anything else, cut your branch from the remote integration branch, whatever branch this worktree started on, and confirm its base:

    git fetch origin <feat/slug>
    git switch -c sdd/<N>-<slug> origin/<feat/slug>
    test "$(git merge-base HEAD origin/<feat/slug>)" = "$(git rev-parse origin/<feat/slug>)"

If the `test` fails, stop and report BLOCKED; write no code on a branch with any other base.
Then call the Skill tool with "implement-issue" for <issue URL> and follow it. This brief is the context that skill assumes.

## Ticket (verbatim)

<the full sub-issue body: What to build, Acceptance criteria, Blocked by, Files owned, Interfaces, Test scenarios, Verify>

## Scope and non-goals

<one paragraph: the slice, and the tempting adjacent work to leave alone, usually the neighbouring tickets by number and title>

## Laws

<the sources of this repo's Laws line: the `Laws:` line of the `<!-- sdd-routing -->` block in `CLAUDE.md` or `AGENTS.md`, or the fallback list (`CLAUDE.md`, `AGENTS.md`, `GLOSSARY.md`, `CONCEPTS.md`, `CODING_STANDARDS.md`, `CONTRIBUTING.md`, and the ADR directory (`docs/adr/`, or the path the repo's domain docs name)); the epic decisions that bind this slice, quoted by number; anything the orchestrator would otherwise have to review for. Name sources, not rules: the worker reads them itself>

## Seams and patterns

<the files, functions and contracts the work touches, and the in-repo pattern to imitate (e.g. "model `src/billing/refund.ts` on `src/billing/charge.ts`")>

## Mechanics

- Integration branch: `<feat/slug>` in <owner/repo>. `sdd/<N>-<slug>` is cut from `origin/<feat/slug>` by the first step above; PR into `<feat/slug>`.
- Cross-repo inputs you consume: <what, where it is reachable from this checkout (preview URL, local service, regenerated client), and how to confirm it; or "none">.
- Claim #<N> with the claimed label as implement-issue §2 says; write worker-<N> on the Worker line.
- Commit as you go; conventional commit messages; the last commit before the PR is the one Verify ran on.
- Open the PR with `Closes #<N>` in the body. Do not merge.
- Progress: one comment on #<N> under `<!-- sdd-progress -->`, rewritten in place, through `sync-progress.sh progress` (the `sync-progress` skill owns the format).
- Secrets / env this slice needs: <list, or "none">. If anything listed is missing, stop and report; do not improvise.

## Report

Reply in ≤ 200 words: status (DONE / DONE_WITH_CONCERNS / BLOCKED / NEEDS_CONTEXT), PR link, commits, TDD evidence (RED and GREEN commands with their output), Verify SHA, and anything the reviewer must know. For BLOCKED or NEEDS_CONTEXT, say exactly what you are stuck on, what you tried, and what would unblock you. Then stop.
```

## Tier note

Put the tier decision in the dispatch call, not the brief. A ceiling-tier brief is not longer; it is the same brief for harder work.

## Fix-round addendum

When a reviewer sends the worker back, append to the same brief (or message the resumed worker) exactly this:

```markdown
## Review findings (round 1 of 1)

<the reviewer's Critical and Important findings, verbatim, one per bullet, grouped under Spec and Quality>

Cross-cutting class: <ids>, spanning <files>; you own every file listed for this round, including files outside your ticket's Files owned, and the fix is one shared mechanism, not one patch per file.

Address every item or explain in the PR why not. Re-run the tests that cover the amended code and name them; re-run Verify. Append a fix report to the PR body: what changed, the covering tests, the command, the output. Update the progress comment. Report again in the same format.
```

The `Cross-cutting class:` line is optional: include it only on a panel fix round whose class `review-panel` §7 routed whole to this worker, one line per class.

There is one fix round with the same worker. If the re-review still leaves findings open, the orchestrator may make **one** fresh dispatch on the ceiling tier carrying the brief, the PR, and the open findings ("a prior worker attempted this twice; you own it now"); after that it goes to `ready-for-human`.
