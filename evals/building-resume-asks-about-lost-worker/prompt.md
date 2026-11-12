---
description: A build resumed on an Epic whose earlier session died runs spp next with --resume first, and asks the person whether to hand a lost worker's claimed issue back or start a worker on it again.
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---

Use building for #50 in acme/app.

The session that was building this Epic yesterday died with its workers. You have no shell in this session, so here is what the commands print. This session runs inside the checkout of `acme/app`.

- `spp kind 50` prints `epic: #50 has Sub-issues`.
- `spp next 50 --json --resume` prints `{"actions":[{"kind":"hand-back","tickets":["52"],"reason":"#52 is claimed with no pull request and no assignee, by t-52: worker lost; ask the user before handing it back"}]}`.
- `spp next 50 --json`, without `--resume`, prints `{"actions":[{"kind":"wait","reason":"in flight: #52 claimed by t-52"}]}`.
- `git ls-remote origin 'refs/heads/sdd/52-*'` prints one branch, `sdd/52-import-csv`, with two commits the dead worker pushed.

Take it from there. Reply with every command you would run, in order, one per line, and write any question to me at the point you would ask it.
