---
description: In a terminal, where no session can be started, /build asks nothing about where to run and starts building here.
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---

/build 340

This session runs in a terminal. The session-start tool is not available here, and a ToolSearch for it finds nothing. This session's folder is the checkout of `syn54x/skills-plus-plus`, which owns #340. You have no shell tool in this session: reply with the first command you want run, and I will run it and paste what it prints.
