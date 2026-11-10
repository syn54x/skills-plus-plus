---
type: llm
focus: last_message
---

The session was told to use `building` for Epic 50 of `acme/app` after an earlier build session died with its workers. `spp next --resume` returns a `fix` for pull request #61, which `t-52` opened in that earlier session. A subagent worker dies with its session, so `t-52` no longer answers. The fix round goes to a fresh worker on the existing branch: free the branch first (remove the dead worker's worktree at `/home/me/app/.claude/worktrees/agent-9f3e` and the local `sdd/52-import-csv` branch), write the brief with `spp brief 52` (`spp dispatch 52` refuses the claimed issue), then start a new worker whose prompt carries the finding and sends it straight to the fix round.

PASS if the reply does all of these, in this order: removes the worktree at `/home/me/app/.claude/worktrees/agent-9f3e` and deletes the local branch `sdd/52-import-csv`; runs `spp brief 52`; starts a new worker whose prompt names the brief's path, pull request #61 and the finding about the byte order mark, and tells it to go to its fix round.

FAIL if the reply sends any message to `t-52` (or to any worker of the earlier session), runs `spp dispatch 52` as the way to start the worker, starts the new worker before the worktree and branch are removed, starts no worker, or starts one whose prompt leaves out the finding.
