---
"mattpocock-skills": patch
---

build-epic, implement-issue: make worktree workers start from the right base and keep the worktrees a re-review needs. The worker brief's first step now fetches the integration branch, cuts `sdd/<N>-<slug>` from `origin/<integration branch>` whatever the worktree started on, and checks the merge base before any code is written; the Claude Code dispatch note no longer relies on switching the orchestrator's checkout, and implement-issue's branch step names the same remote ref (#33). build-epic step 6 keeps a PR's worker and reviewer worktrees until that PR merges or goes to `ready-for-human`, so a sibling merge removes neither, and when a reviewer cannot be resumed the fresh one gets the earlier findings by id and the reviewed head SHA and runs review-pr's scoped re-review, with an example of both paths (#20).
