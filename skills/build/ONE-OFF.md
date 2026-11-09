# The One-off path

Read only when `spp kind` says `one-off`, never for a `sub-issue`, which is built through its Epic. A One-off has no Epic and no integration branch: its worker branches from the repo's default branch and its pull request targets it. One worker, one gate, one pull request that the user merges. There is no Wave to approve, since the user's `/build <N>` is the approval, and no `spp next`, `spp wait` or Wave comment, all of which read an Epic.

## 1. Start the worker

Pick the driver from step 2 of `SKILL.md` by testing each capability yourself, in its order: the session-start tool, then the messaging socket, then isolated subagents. `spp next` is not there to report it. `spp dispatch <N> --driver <d>` writes the brief and, for a background session, starts the worker. It refuses an issue that is held; report who holds it and stop. Choose the worker's tier as `SKILL.md` says.

Done when a worker is running on the issue.

## 2. Wait

Be woken when the worker's turn ends: desktop and subagent workers wake you, and for a background session ask to be notified when its session next goes idle. Print the heartbeat while you wait, from the issue's progress comment.

Then read the report (step 3 of `SKILL.md`). A `NEEDS_CONTEXT` that is an unsettled design is the user's to settle here: put the question to them, and when they answer, edit the issue body to match, restore `ready-for-agent` and start the worker again. Settle nothing alone, since a One-off has no Epic to carry a Spec delta.

Done when the report is `DONE` or `DONE_WITH_CONCERNS` with a pull request, or the issue is handed back and the user told why.

## 3. Gate

Call the Skill tool with "review" for the pull request. A pass on both verdicts goes to step 4.

On a fail, send the Critical and Important findings to the same worker for one fix round, which it plans before it edits, and gate the new head. A second failure: `spp hand-back <N> ready-for-human --reason "<the open findings>"`, leave the pull request open, and tell the user what is open.

## 4. Hand over

The pull request is the user's to merge. Give them its link, the two verdicts, the concerns from the report, and any `Interfaces changed:` line. The pull request targets the default branch, so its `Closes #<N>` closes the issue on merge. Do not merge, and do not close the issue yourself. Once the user has the pull request, run the checkpoint (`SKILL.md`, Checkpoint); this is the end of the run. Remove the worker's worktree once the user has merged (see `CLAUDE-CODE.md`).
