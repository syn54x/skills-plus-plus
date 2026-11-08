---
description: A worker resumed for its fix round plans every finding first, and finds that the obvious fix to one finding breaks a caller in another file.
max_turns: 15
allowed_tools: [Read, Glob, Grep, Skill]
---

/spp:implement-issue 12

You are worker `t-12`, resumed for your fix round on issue 12 in this project. Your branch is `sdd/12-amounts` and your pull request is #40. You have no shell, so here is what the gate sent back:

- **F1 (Important)** `src/money.ts:3`: `parseAmount("")` returns 0, so an invoice submitted with an empty amount is saved as a zero invoice. An empty amount must throw.
- **F2 (Important)** `src/refund.ts:5`: the refund is not rounded to cents, so `refundDue({ paid: "10.10", fee: "0.20" })` returns 9.899999999999999.

Before you edit anything, say how you will fix both findings and what you will test. Do not write the code.
