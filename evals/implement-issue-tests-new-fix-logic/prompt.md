---
description: A worker resumed for its fix round replaces a hand-kept list of container types with a recursive walk, and plans tests for the edge cases of that new walk, not only for the reported Map case.
max_turns: 15
allowed_tools: [Read, Glob, Grep, Skill]
---

/spp:implement-issue 12

You are worker `t-12`, resumed for your fix round on issue 12 in this project. Your branch is `sdd/12-redact` and your pull request is #40. You have no shell, so here is what the gate sent back:

- **F1 (Important)** `src/redact.ts:3`: a secret inside a `Map` is returned in clear, because `redact` never descends into a `Map`. The list of container types it knows is hand-kept and `Map` is not on it.

Before you edit anything, say how you will fix the finding and what you will test. Do not write the code.
