---
description: From a folder that is not a git repository, building starts no worker and sends the person to the repository's checkout.
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill, Agent]
---

Use building for https://github.com/acme/app/issues/12

This session runs in `~/work`, the folder that holds the checkouts of all our repositories. It is not a git repository itself: `git rev-parse --git-dir` fails here, and the checkout of `acme/app` is at `~/work/app`. You have no shell in this session, so here is what the commands print. `spp kind https://github.com/acme/app/issues/12` prints `one-off`. Issue 12 is ready, nobody holds it, and its tier is the default model. Go ahead.
