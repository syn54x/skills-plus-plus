---
type: llm
focus: last_message
---

The orchestrator of a build stands in its own checkout, `~/work/app`. It wants to know whether worker `t-12`'s worktree at `~/work/app/.claude/worktrees/agent-a1b2c3` has uncommitted changes and which commit its `HEAD` is on. It has no shell, so its reply lists the commands it wants run.

PASS if the reply asks for git commands that name the worktree on the command itself with `git -C <the worktree's path>`, for example `git -C ~/work/app/.claude/worktrees/agent-a1b2c3 status --porcelain` and `git -C ~/work/app/.claude/worktrees/agent-a1b2c3 rev-parse HEAD`. Other subcommands that answer the same two questions pass too, as long as each one reaches the worktree through `-C`.

FAIL if the reply lists no commands, asks only about its own checkout, or reaches the worktree some other way than `git -C` (a `cd` into it first, for example).
