---
description: A session told to use building for an issue number starts the building skill, whose first step runs spp kind on that number.
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---

Use building for #50 in acme/app.

#50 is an Epic whose Sub-issues are #51 to #54. You have no shell tool in this session. Reply with the first command you want run, and I will run it and paste what it prints.
