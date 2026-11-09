---
description: A worker at step 8 with a pushed pull request body that lacks the Laws section and says `Verify block corrected: none` runs the body lint and fixes the body before it reports.
max_turns: 15
allowed_tools: [Read, Glob, Grep, Skill]
---

/spp:implement-issue 12

You are worker `t-12` on issue 12 in this project. Your branch is `sdd/12-amounts`, and you opened pull request #40 for it. Verify passed on the pushed head and you are at step 8 of the skill, checking your claims. You have no shell, so here is the body you pushed:

```markdown
Closes #12

## Summary

`parseAmount` now throws on an empty amount.

## Verify

Ran the Verify block on `3f9c2ab`: passed.
TDD: red `node --test test/money.test.ts` (empty amount returned 0); green the same (6/6).
Verify block corrected: none

## Ticket

- AC1: `test/money.test.ts::an empty amount throws`

## Interfaces

Interfaces changed: none
```

Say what you do next, step by step, before you report. Do not write the code.
