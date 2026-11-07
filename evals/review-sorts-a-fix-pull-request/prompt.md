---
description: A pull request with no closing line that opens Refs a Sub-issue and targets its Epic's integration branch is sorted as a fix, with both verdicts, not as quality only.
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---

/spp:review 88

You are already the fresh reviewer. You have no shell, so here is what the commands print. `gh pr view 88 --json headRefOid,baseRefName,body,files` prints head `a1b2c3d4e5f6`, base `feat/search-is-fast`, and a body that opens `Refs #41` and then says: "Fixes the Critical finding from the gate: the query cache ignored the tenant id." The body has no `Closes`, `Fixes` or `Resolves` line. `spp kind 41 --json` prints `sub-issue`; issue 41 is a Sub-issue of Epic #30, whose plan comment names `feat/search-is-fast` as its integration branch. Say how you sort this pull request and what you will run and record. Do not review the diff.
