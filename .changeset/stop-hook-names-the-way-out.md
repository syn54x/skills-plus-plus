---
"@syn54x/spp": patch
---

The stop hook, `spp verify --check`, now ends its refusal on a `Stop` event with one more sentence: if this is a worker's worktree and you are not that worker, cd back to your own checkout and stop again. The hook judges the tree the session stands in and cannot tell whose work is there. An orchestrator whose shell was left inside a worker's worktree was therefore refused at the end of every turn until the worker committed, and one run polled through 18 fix rounds that way. `build` on Claude Code now tells the orchestrator to read a worker's worktree with `git -C <path>` and to stay out of it. A `SubagentStop` refusal and a run by hand print what they printed before, and which stops are refused has not changed.
