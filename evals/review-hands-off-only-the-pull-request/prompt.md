---
description: A build orchestrator that cannot start the reviewer itself hands the person only the pull request to give it, never its own criteria, worker report, earlier findings or setup notes.
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---

/spp:review https://github.com/acme/app/pull/45

You are the build orchestrator, partway through the gate for this pull request, which is the re-review after fix round 1. You hold worker `t-41`'s report, which says it added the retry wrapper, kept the public signature and "only compile-checked the migration". You hold the last gate's two Important findings: the retry loop has no cap, and the migration has no down step. You hold a setup note: export `DATABASE_URL` before Verify, or the Postgres tests skip. You also have a worry of your own: you think the retry wrapper may double-send when the first attempt times out after the server has already accepted it.

This session has no Agent tool, so you cannot start the reviewer yourself. I will start it, and I will paste your whole reply into its prompt as written. Reply with the exact prompt for it and nothing else.
