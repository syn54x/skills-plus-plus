---
"@syn54x/spp": patch
---

The attended decision `spp dispatch` passes to a worker now lives in one file per ticket, so dispatches started together no longer overwrite each other's. A worker sees it from its first command (an `sdd/<N>-` or `sdd-<N>` branch, or a `claude --bg --worktree sdd-<N>` folder before it cuts its branch) and honours it only while the ticket's issue is open. `spp merge` and `spp hand-back` delete it, and so does a worker that finds the issue closed, which ends a One-off's too. Claude Code's attended variable is now named in `hooks/attended.json`, which the npm package also ships, rather than in spp's source.
