## What it does

`build` turns a filed plan into merged slices. Given an Epic, it starts one worker per ready Sub-issue, gates each pull request with a fresh reviewer, merges the passing ones in dependency order, and opens the Epic's pull request to your base branch. Given a hardened One-off, it runs one worker and one gate and hands you the pull request.

It remembers nothing. Every decision, from what kind of issue you gave it to which action comes next, is read from GitHub by `spp kind` and `spp next`, so interrupting it costs nothing: you run `/build <N>` again and it carries on from what GitHub shows. It also never merges to your base branch. That merge, and the one-off's, are yours.

## When to reach for it

You type `/build <N>`; the agent never starts it on its own. Use it once the plan exists: an Epic that `/to-tickets` has broken into Sub-issues, or an issue that triage has hardened with the full Ticket contract.

What `build` does depends on what `<N>` is:

| `spp kind` says | What `build` does |
| --- | --- |
| `epic` | Runs the Epic path: Waves of workers, a gate on each pull request, merges, then the main gate. |
| `sub-issue` | Stops and points you to `/build` on its Epic. A Sub-issue is built through its Epic, never on its own. |
| `one-off` | Runs the One-off path: one worker, one gate, a pull request for you to merge. |
| `raw` | Stops and points you to `/triage`. An issue without the contract never reaches a worker. |

For work too small to file, skip spp and edit directly. `ask-spp` routes between every skill when the right one is unclear.

## The loop on an Epic

`build` runs `spp next`, does what it prints, and runs it again. The actions come in this order of an Epic's life:

| Action | What happens |
| --- | --- |
| `preflight` | A precondition fails (an old `gh`, no plan comment, no Routing block). `build` tells you the fix and stops. |
| `branch` | The integration branch is cut from the base and recorded on the plan comment. |
| `dispatch` | A Wave of ready, non-overlapping Sub-issues starts, one worker each. You approve the first Wave only. |
| `gate` | A fresh reviewer reads the pull request and returns the spec and quality verdicts. |
| `fix` | A failed gate goes back to the same worker for one fix round. |
| `hand-back` | The fix round is spent, so the issue returns to you with the open findings; or its worker stopped before opening a pull request (`worker lost`), and you are asked whether to hand it back or start a worker again (after `spp unclaim`, on a fresh branch). |
| `merge` | A passing pull request merges once its blockers have. A conflict sends the worker back to rebase. |
| `main-gate` | Every Sub-issue merged. `build` opens the Epic's pull request and gates it. |
| `close` | The pull request merged. `build` points you to `/close-epic`. |

When the Epic gets stuck, `spp next` says so (`stuck`) and `build` reports why. A dependency cycle or a missing label needs a person, not a retry.

## Drivers

A worker runs in the best session mechanism the session offers. `build` checks for each by capability, in this order, and uses the first that is present:

| Driver | Chosen when | What you see |
| --- | --- | --- |
| Desktop linked sessions | The desktop app's session tool is available | A sidebar row per worker that you can open and steer |
| Background sessions | The cross-session messaging socket is present | Workers listed by `claude agents`; `claude attach t-<N>` opens one |
| Isolated subagents | Neither of the above | Workers inside the session, each in its own worktree |

All three keep one contract: an issue number goes in, a pull request comes out, and all state lives in GitHub. That is why you can change driver between runs.

While workers run, `build` prints one line per worker from `spp status` and the workers' notes. It never reads a worker's transcript. A worker with no note shows as "no update since dispatch".

## Common questions

**A worker said it needs a decision. What happens?**
The worker hands the issue back and stops. If it is a missing fact, `build` supplies it and resumes the worker. If it is a design the Epic left open, `build` runs [grilling](grilling.md) with you, records a hard-to-reverse answer with [domain-modeling](domain-modeling.md), writes the decision into the Epic as a Spec delta, rewrites the affected Sub-issues, and starts the worker again on the amended issue.

**Why does a failed pull request get only one fix round?**
If a second head still fails, one round of fixing has not settled it, and more rounds mostly burn tokens. The issue goes back to you with its open findings, and the rest of the Epic keeps moving.

**I closed the terminal in the middle of a Wave. Is anything lost?**
No. Workers keep their claim and their pull requests in GitHub. Run `/build <N>` again: `spp next` reads the state, sees the claimed issues and the open pull requests, and picks up from there.

**Why am I asked to approve only the first Wave?**
The first Wave is where the plan meets the code. Later Waves that follow the plan start by themselves, and `build` comes back to you only when the plan changes, such as a new blocked-by edge or a re-bundled issue.

**The Epic is large. Do I run the review panel myself?**
`spp next` decides: four or more Sub-issues, any size L, or 1,000 changed lines runs the panel on the Epic's pull request. Smaller Epics get a single spec verdict from [review](review.md). The panel's skill is user-invoked, so `build` walks the panel's own steps itself: it gathers the panel folder, picks the Personas, fans them out, and merges what they found into one verdict.

**Can it build an issue from another repo?**
Give `/build` the issue's URL. Each Sub-issue is built in the repo it lives in, and a cross-repo blocker has to have merged before its consumer is ready.

## It's working if

- Interrupting the run and starting it again changes nothing you have to repair.
- Each worker's pull request is open against the integration branch, and each carries `Closes #<N>` on its first line.
- You are asked once, before the first Wave, and not again unless the plan changed.
- No pull request reaches your base branch without a spec verdict and a quality verdict on its head.
- The run ends with a pull request for you to merge and a pointer to `/close-epic`, or with a clear list of the issues that were handed back.
