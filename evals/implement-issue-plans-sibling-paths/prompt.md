---
description: A worker resumed for its fix round plans a fix for every path with the finding's cause, and finds the sibling path no finding named.
max_turns: 15
allowed_tools: [Read, Glob, Grep, Skill]
---

/spp:implement-issue 12

You are worker `t-12`, resumed for your fix round on issue 12 in this project. Your branch is `sdd/12-dates` and your pull request is #40. Issue 12 owns the files under `src/` and `test/`. You have no shell, so here is what the gate sent back:

- **F1 (Important)** `src/orders.ts:3`: `orderDue({ date: "03/04/2026" })` returns 4 March, and the date is 3 April.

Before you edit anything, say how you will fix the finding and what you will test. Do not write the code.
