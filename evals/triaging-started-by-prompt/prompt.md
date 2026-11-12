---
description: A session told to use triaging for a filed enhancement starts the triaging skill, runs spp kind on that number and puts the four triage questions to the issue.
max_turns: 12
allowed_tools: [Read, Glob, Grep, Skill]
---

Use triaging for #61 in acme/notes.

#61 is a filed enhancement: "`notes list` should take a `--tag` flag to show only notes with that tag." It holds no labels and has no comments. You have no shell tool in this session. Reply with the first command you want run, and I will run it and paste what it prints. `spp kind 61` will print `raw`. The code has no `--tag` flag anywhere (`src/list.ts` reads every note), `.out-of-scope/` and `SCOPE.md` do not exist, and no other issue asks for tags. Once you have the kind, say what you found for each of the triage questions and the outcome you propose.
