## What it does

`implement-issue` is the procedure every spp worker follows: one Sub-issue or One-off goes in, and one pull request that closes it comes out. The worker confirms the issue is ready, takes the claim, cuts a branch from the right base, builds test-first, runs the issue's Verify block, reviews its own diff, opens the pull request, and reports back.

It never merges and never writes to GitHub on its own account. Every claim, progress update, note and hand-back goes through `spp`, so the state of the work lives in the issue and the pull request rather than in the worker's conversation, and a lost session loses nothing.

## When to reach for it

Type `/implement-issue <N>`, or the agent starts it when a task fits: a brief or a driver hands it an issue whose body holds the full Ticket contract. Most runs start inside `/build`, which writes a brief for each ready Sub-issue and starts one worker per issue, in its own worktree. On the single-issue path, `/build` does the same for a hardened One-off.

| Your situation | Use |
| --- | --- |
| A Sub-issue or One-off that carries the full Ticket contract | `implement-issue` |
| A raw issue with no Files owned or Verify block | triage first, which hardens it |
| A behaviour to build test-first with no issue behind it | [tdd](tdd.md) |
| A failure nobody has explained yet | [diagnosing-bugs](diagnosing-bugs.md) |

`ask-spp` routes between every skill when the right one is unclear.

## One issue in, one pull request out

A worker sees nothing but its brief and the issue. That narrowness is what lets several run at once: each owns a disjoint set of files, codes against interfaces the issue spelled out, and records everything in GitHub. When a worker cannot finish, it hands the issue back with a route (`needs-info`, `ready-for-human` or `blocked`) and a reason, which also clears its claim, so the issue never sits held by a worker that has stopped.

The pull request body is written with [pr](pr.md), and its Ticket, Laws, Interfaces and Verify sections are claims that the review gate checks line by line against the diff.

## Common questions

**What does the `claimed` label mean?**
The worker added it before any work began, and it marks the issue as held. A held issue is out of the ready queue, so no second worker takes it. The progress comment's Worker line says who holds it, and the label stays until the pull request merges or the worker hands the issue back.

**Why won't the worker stop?**
The stop hook refuses to let a worker on an `sdd/*` branch finish while its tree has uncommitted changes, or while `HEAD` has no passing Verify record. The fix is to commit and run Verify. A worker that cannot build the issue hands it back and records the stop as blocked instead, which the hook accepts.

**Two pull requests opened with the same body. How?**
Parallel workers once wrote their bodies to one shared temp path, and a sibling's write landed between another worker's write and its `gh pr create`. Each worker now writes to a fresh file named for its own issue.

**The issue's Produces signature cannot work. Does the worker stop?**
That depends on who else reads the signature. Code that lives only in this repo may change: the worker ships a version that works, lists the requested and shipped forms on an `Interfaces changed:` line, and reports `DONE_WITH_CONCERNS`, so the change is an Interface deviation on the record rather than a silent drift. A route, an event payload or anything the Epic itself names is read by other code too, so it stays fixed and the worker stops with `NEEDS_CONTEXT`.

**Why does the pull request need a Laws section?**
Review rounds kept citing rules the worker had read up front but never held against its own changes. A line per rule, stating how the change complies, makes that comparison unavoidable. A rule that names a moment, such as "before writing a second copy", is checked at that moment during the build, when acting on it is cheapest.

**The report said a test existed, but the diff had no such test.**
Reports used to be written from memory. The worker now checks every test, file and hunk its report and pull request name against the pushed branch before it reports, and either fixes the gap or removes the claim.

**How is a skill-only or docs-only issue built test-first?**
Its Verify commands stand in for tests. Run before any edit, the commands that fail are the red evidence; the worker then edits until every one of them passes. A command that already passed before any edit is listed as a weak pin, so the reviewer knows that check proves little.

## It's working if

- Each issue you build ends as one open pull request whose first line is `Closes #<N>`, targeting the integration branch or, for a One-off, the default branch.
- The progress comment on the issue shows the worker, the branch, the pull request and a passing Verify SHA that matches the pull request's head.
- No pull request touches a file outside its issue's Files owned without saying why.
- An issue a worker gave up on carries a route label and a reason, and no `claimed` label.
- Nothing merges until a reviewer has gated it.
