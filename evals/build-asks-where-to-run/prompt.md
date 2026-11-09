---
description: In a session that can start sessions and has already started two, /build asks here or sub-session first and recommends the sub-session.
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---

/build 340

You have no shell in this session, so here is what you would find. This session runs in the desktop app, and the session-start tool (`mcp__ccd_session__start_session`) is available. Listing this session's linked sessions shows two it started earlier today: `build-318` and `triage-322`. This session's folder is `~/work/skills-plus-plus`, whose git remote is `git@github.com:syn54x/skills-plus-plus.git`, and #340 is an issue of `syn54x/skills-plus-plus`.
