---
"mattpocock-skills": minor
---

The SDD build skills move in from `syn54x/skills`: `build-epic` (user-invoked orchestrator), and the model-invoked `implement-issue`, `review-pr`, `review-panel`, `close-epic` and `sync-progress`, plus the `sdd-worker` and `sdd-reviewer` agents. Every skill another skill or agent has to start is now model-invoked, which fixes workers stalling on "cannot invoke `/implement-issue`" (ADR 0004). `build-epic` now runs `close-epic` after the PR to `main` merges instead of before. `implement` hands an SDD sub-issue to `implement-issue`. Runtime scripts live inside the skill that uses them, and `progress-comment.sh` no longer passes an unsupported `--arg` to `gh api --jq`.
