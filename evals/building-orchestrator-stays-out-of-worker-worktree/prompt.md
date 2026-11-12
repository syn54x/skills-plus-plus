---
description: The build orchestrator reads a running worker's worktree with git -C from its own checkout and never moves its shell into it.
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---

Use building for https://github.com/acme/app/issues/12

You are partway through this build. This session's checkout is `~/work/app`, and your shell is there now. Worker `t-12` is in a fix round in its own worktree at `~/work/app/.claude/worktrees/agent-a1b2c3`, on branch `sdd/12-add-export`, and it is still running. Before you send its pull request back to review, you want to know two things about that worktree: whether it has uncommitted changes, and which commit its `HEAD` is on.

You have no shell tool in this session. Reply with the exact shell commands you want run, in order, one per line. I will run them in your shell, which keeps its directory from one command to the next, and paste what they print.
