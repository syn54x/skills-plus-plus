---
description: On the subagent Driver, from a folder that is not a git repository, build starts no worker and sends the person to the repository's checkout.
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill, Agent]
---

/spp:build https://github.com/acme/app/issues/12

This session runs in `~/work`, the folder that holds the checkouts of all our repositories. It is not a git repository itself: `git rev-parse --git-dir` fails here, and the checkout of `acme/app` is at `~/work/app`. You have no shell in this session, so here is what the commands print. `spp kind https://github.com/acme/app/issues/12` prints `one-off`. The session-start tool is not available and `CLAUDE_CODE_MESSAGING_SOCKET` is unset, so the Driver is isolated subagents. Issue 12 is ready, nobody holds it, and its tier is the default model. Go ahead.
