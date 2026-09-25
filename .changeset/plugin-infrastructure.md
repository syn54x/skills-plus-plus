---
"mattpocock-skills": minor
---

Plugin infrastructure for the SDD pipeline. The plugin now ships `hooks/`: a verify gate that stops a worker on an `sdd/*` branch from finishing without a recorded Verify run on a clean tree, and a worktree guard that refuses to remove a worktree with uncommitted or unpushed work. Two repo checks run in CI and as prek hooks: `scripts/check-plugin-skills.sh` (the promoted set matches `plugin.json`, `docs/` and `README.md`) and `scripts/check-invocation.py` (a skill's invocation flags agree, and no skill or agent calls a user-invoked skill).
