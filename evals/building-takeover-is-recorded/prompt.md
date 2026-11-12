---
description: When the person takes over a pull request whose worker died with an earlier session, building puts its issue on the running list, so the next spp next waits on it instead of printing the same fix, and it asks nothing more about it.
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---

Use building for #50 in acme/app.

The session that was building this Epic yesterday died with its workers. You have no shell in this session, so here is what has happened. This session runs inside the checkout of `acme/app`, whose integration branch for #50 is `feat/csv`.

- `spp kind 50` printed `epic: #50 has Sub-issues`.
- `spp next 50 --json --resume` printed `{"actions":[{"kind":"fix","tickets":["52"],"pr":"https://github.com/acme/app/pull/61","reason":"#61 failed its gate; one fix round by the same worker"}]}`.
- Pull request #61 was opened yesterday by `t-52` from the branch `sdd/52-import-csv`. This session started no worker, and the running list is empty. Its quality verdict failed with one Important finding: "src/import.ts:40 drops the header row when the file has a byte order mark".
- You asked me: "#50 waits on you: #61 on #52 needs a fix round, and the worker that opened it died with an earlier session. Hand #52 back, or take the pull request over yourself?"

My answer: I take it. I'll push the fix to #61 myself.

Take it from there. Reply with every command you would run, in order, one per line, with every flag in full, and where you would ask me something, write it in full at that point.
