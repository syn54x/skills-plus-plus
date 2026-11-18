---
description: Checking the set, to-tickets finds a Verify block that runs a test file another Sub-issue moves, and orders the mover first.
max_turns: 15
allowed_tools: [Read, Glob, Grep, Skill]
---

/spp:to-tickets 60

Steps 1 to 3 are done, so pick up at checking the set. Epic 60 is split into Sub-issues 61 and 62, and harden has written both. You have no shell in this session, so the bodies are files in this project: `epic.md` holds the Epic, `sub-issue-verifier.md` holds 61 and `sub-issue-mover.md` holds 62. The repo is on the spp flow: its Routing block reads Mode: solo, Sizes: `size:S/M/L` labels, Laws: none. Neither Sub-issue blocks the other on GitHub, `spp status 60 --json` prints an empty `cycle`, and `spp lint ticket` prints `ok` for both.

Check the set and tell me what you find before you release anything.
