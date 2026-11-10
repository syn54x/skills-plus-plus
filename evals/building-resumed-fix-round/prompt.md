---
description: A resumed build that meets a fix for a pull request whose worker died with an earlier session starts a fresh worker on the existing branch, with the findings, and never messages the dead worker.
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---

Use building for #50 in acme/app.

The session that was building this Epic yesterday died with its workers. You have no shell in this session, so here is what the commands print. This session runs inside the checkout of `acme/app`, whose integration branch for #50 is `feat/csv`.

- `spp kind 50` prints `epic: #50 has Sub-issues`.
- `spp next 50 --json --resume` prints `{"actions":[{"kind":"fix","tickets":["52"],"pr":"https://github.com/acme/app/pull/61","reason":"#61 failed its gate; one fix round by the same worker"}]}`.
- Pull request #61 was opened yesterday by `t-52` from the branch `sdd/52-import-csv`. Its quality verdict failed with one Important finding: "src/import.ts:40 drops the header row when the file has a byte order mark".
- `git worktree list` shows `/home/me/app/.claude/worktrees/agent-9f3e` on `sdd/52-import-csv`.

Take it from there. Reply with every command you would run, in order, one per line, and where you would start a worker or send one a message, write the prompt or message in full at that point.
