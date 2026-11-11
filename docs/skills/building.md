## What it does

`building` turns a filed plan into merged slices. Given an Epic, it starts one worker per ready Sub-issue, gates each pull request with a fresh reviewer, merges the passing ones in dependency order, and opens the Epic's pull request to your base branch. Given a hardened One-off, it runs one worker and one gate and hands you the pull request.

It remembers nothing. Every decision, from what kind of issue you gave it to which action comes next, is read from GitHub by `spp kind` and `spp next`, so interrupting it costs nothing: you run `/build <N>` again and it carries on from what GitHub shows. It also never merges to your base branch. That merge, and the one-off's, are yours.

## When to reach for it

Type `/building <N>`, or the agent starts it when it is told to build a specific Epic or issue number. You will usually type [build](build.md) instead, which hands the issue to `building`. A session that is told "use building for #N" builds N the same way, so an agent that sends work out, such as a Chief of Staff session, can start a build without you typing `/build`. Use it once the plan exists: an Epic that `/to-tickets` has broken into Sub-issues, or an issue that triage has hardened with the full Ticket contract. It belongs to the build step of the Epic path and the single-issue path.

What `building` does depends on what `<N>` is:

| `spp kind` says | What `building` does |
| --- | --- |
| `epic` | Runs the Epic path: Waves of workers, a gate on each pull request, merges, then the main gate. |
| `sub-issue` | Stops and points you to `/build` on its Epic. A Sub-issue is built through its Epic, never on its own. |
| `one-off` | Runs the One-off path: one worker, one gate, a pull request for you to merge. |
| `raw` | Stops and points you to `/triage`. An issue without the contract never reaches a worker, and neither does one whose Verify block was never pinned or changed after hardening. |

For work too small to file, skip spp and edit directly. `ask-spp` routes between every skill when the right one is unclear.

## The loop on an Epic

`building` runs `spp next`, does what it prints, and runs it again. The actions come in this order of an Epic's life:

| Action | What happens |
| --- | --- |
| `preflight` | A precondition fails (an old `gh`, no plan comment, no Routing block). `building` tells you the fix and stops. |
| `branch` | The integration branch is cut from the base and recorded on the plan comment. |
| `dispatch` | A Wave of ready, non-overlapping Sub-issues starts, one worker each. You approve the first Wave only. |
| `gate` | A fresh reviewer reads the pull request and returns the spec and quality verdicts. |
| `fix` | A failed gate, on a slice or a fix pull request, goes back to the worker that opened it for one fix round. When that worker died with an earlier session, you are asked whether to hand the issue back or take the pull request over. |
| `hand-back` | The fix round is spent, so the issue returns to you with the open findings; or its worker stopped before opening a pull request (`worker lost`), and you are asked whether to hand it back or start a worker again (its local worktree and branch are removed first, then `spp unclaim`). A new worker starts on a fresh branch from the integration branch, so a branch the lost worker pushed is yours to delete (its commits lost), or you hand the issue back. |
| `merge` | A passing pull request merges once its blockers have. A conflict sends the worker back to rebase; when that worker is gone, you are asked as for a fix round. |
| `main-gate` | Every Sub-issue merged. `building` opens the Epic's pull request and gates it. |
| `close` | The pull request merged. `building` points you to `/close-epic`. |

When the Epic gets stuck, `spp next` says so (`stuck`) and `building` reports why. A dependency cycle or a missing label needs a person, not a retry.

## Workers

Every worker is a subagent, one per issue, each in its own worktree cut from the session's checkout. `building` asks nothing about how workers run, so each Wave after the first starts on its own, even on a wake-up. A worker keeps one contract: an issue number goes in, a pull request comes out, and all state lives in GitHub.

Whenever `building` stops to wait on you, its message opens with one line, `#<N> waits on you: <question>`, and the detail follows: the first Wave's approval with the Wave's table, a lost worker, a red Verify after a merge, a design to settle, or an issue it cannot build (a Sub-issue or a raw issue). A parent session sees only the opening of a sub-session's message, so you can answer from the parent, and the answer it passes on counts as yours.

While workers run, `building` prints one line per worker from `spp status` and the workers' notes. It never reads a worker's transcript. A worker with no note shows as "no update since dispatch".

## Common questions

**A worker said it needs a decision. What happens?**
The worker hands the issue back and stops. If it is a missing fact, `building` supplies it and resumes the worker. If it is a design the Epic left open, `building` runs [grilling](grilling.md) with you, records a hard-to-reverse answer with [domain-modeling](domain-modeling.md), writes the decision into the Epic as a Spec delta, rewrites the affected Sub-issues, and starts the worker again on the amended issue.

**How does a fix to a failed Epic gate get merged?**
The worker opens it into the integration branch with `Refs #<Sub-issue>`. `building` then follows `spp next`: the fix is gated, sent back once, merged like a slice, or, after a second failed head, reported to you with its open findings (the closed Sub-issue is not relabelled), and `main-gate` comes up again only once no fix is open. `building` never merges a fix by hand.

**Why does a failed pull request get only one fix round?**
If a second head still fails, one round of fixing has not settled it, and more rounds mostly burn tokens. The issue goes back to you with its open findings, and the rest of the Epic keeps moving.

**I closed the terminal in the middle of a Wave. Is anything lost?**
The workers are. Every worker is a subagent of the session you closed, so it stopped with it, and any work it had not pushed is gone. What GitHub holds survives: the claims, the pushed branches and the open pull requests. Run `/build <N>` again and `building` picks up from that state. Open pull requests are gated and merged as before; for one that needs a fix round or a rebase, you are asked whether to hand its issue back or take the pull request over, since no worker is started on a branch another worker left. For each issue still claimed with no pull request, you are asked whether to hand it back or start a worker on it again, with its leftover worktree and branches named.

**Why am I asked to approve only the first Wave?**
The first Wave is where the plan meets the code. Later Waves that follow the plan start by themselves, and `building` comes back to you only when the plan changes, such as a new blocked-by edge or a re-bundled issue.

**The Epic is large. Do I run the review panel myself?**
`spp next` decides: four or more Sub-issues, any size L, or 1,000 changed lines runs the panel on the Epic's pull request. Smaller Epics get a single spec verdict from [review](review.md). The panel's skill is user-invoked, so `building` walks the panel's own steps itself: it gathers the panel folder, picks the Personas, fans them out, and merges what they found into one verdict.

**Why does it ask me about Skill feedback between Waves?**
When a step spp made had to be corrected (a failed verdict, a hand-back), spp records a Signal against that step. At the end of each Wave, and when the run ends, `building` runs `spp feedback checkpoint`, which lists what is pending and lets you file, skip or keep each one for later. It asks only between steps, because a question in the middle of a gate or fix round would interrupt work that is still running. Under Submission mode Auto it files them and tells you the issue links instead.

**My Epic's plan comment records a `desktop` or `bg` driver. Does it still build?**
Yes. `spp` reads the old record without error and ignores it, so the Epic carries on with subagent workers and nothing asks you to choose.

**Can it build an issue from another repo?**
Give `/build` the issue's URL. Each Sub-issue is built in the repo it lives in, and a cross-repo blocker has to have merged before its consumer is ready.

## It's working if

- Interrupting the run and starting it again changes nothing you have to repair.
- Each worker's pull request is open against the integration branch, and each carries `Closes #<N>` on its first line.
- You are asked once, before the first Wave, and not again unless the plan changed.
- Nothing about Skill feedback is asked while a gate or fix round runs.
- No pull request reaches your base branch without a spec verdict and a quality verdict on its head.
- The run ends with a pull request for you to merge and a pointer to `/close-epic`, or with a clear list of the issues that were handed back.
