---
"@syn54x/spp": patch
---

`spp dispatch <issue> --driver subagent` now refuses a folder that is not inside a git repository, before it reads GitHub. The `spp:worker` agent cuts its worktree from the session's folder, so every worker started from such a folder failed with `Cannot create agent worktree: not in a git repository`. The refusal says to run `/build` from inside the checkout of the repository that owns the issue, or to choose another Driver. The `bg` and `desktop` Drivers are unchanged.
