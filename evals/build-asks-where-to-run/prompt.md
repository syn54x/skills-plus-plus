---
description: In a session that can start sessions and has already started two, /build asks here or sub-session first and recommends the sub-session.
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---

/build 340

This session runs in the desktop app and can start sessions: a ToolSearch here finds the session-start tool (`mcp__ccd_session__start_session`). This eval run has withheld that tool, the session list and the shell from you, so here is what they show. Listing this session's linked sessions shows two it started earlier today: `build-318` and `triage-322`. This session's folder is `~/work/skills-plus-plus`, whose git remote is `git@github.com:syn54x/skills-plus-plus.git`, and #340 is an issue of `syn54x/skills-plus-plus`. `spp kind 340` prints `epic: 3 Sub-issues`.
