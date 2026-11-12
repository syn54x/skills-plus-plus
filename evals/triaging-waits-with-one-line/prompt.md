---
description: When triaging reaches its outcome and waits for the person's word, its final message opens with the waiting line naming the issue.
max_turns: 12
allowed_tools: [Read, Glob, Grep, Skill]
---

Use triaging for #61 in acme/notes.

You run in a sub-session that another session started. You have no shell in this run, so here is what the commands print. `spp kind 61` prints `raw`. #61 is a filed enhancement: "`notes list` should take a `--tag` flag to show only notes with that tag." The repo has the five state labels. Already built: no, `src/list.ts` reads every note and nothing parses `--tag`. Refused before: no, there is no `.out-of-scope/` or `SCOPE.md`, and no other issue asks for tags. True: yes, the flag is missing and `src/list.ts` is where it goes. Clear: yes, one sentence states it and no choice is open. It is one pull request. Reach the outcome and stop where triaging waits for the person.
