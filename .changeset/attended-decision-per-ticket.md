---
"@syn54x/spp": patch
---

The attended decision `spp dispatch` passes to a worker now lives in one file per ticket, so dispatches started together no longer overwrite each other's. A worker sees it from its first command, in a `claude --bg --worktree sdd-<N>` folder before it cuts its `sdd/<N>-` branch, and `spp merge` and `spp hand-back` delete it when the worker is done. Claude Code's attended variable is now named in the plugin's `hooks/attended.json` rather than in spp's source.
