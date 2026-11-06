---
description: Checking the set, to-tickets names a value one Sub-issue works out from another's output and asks whether the producer should supply it.
max_turns: 15
allowed_tools: [Read, Glob, Grep, Skill]
---

/spp:to-tickets 40

Steps 1 to 3 are done, so pick up at checking the set. Epic 40 is split into Sub-issues 41 and 42, and harden has written both. You have no shell in this session, so the bodies are files in this project: `epic.md` holds the Epic, `sub-issue-server.md` holds 41 and `sub-issue-client.md` holds 42. The repo is on the spp flow: its Routing block reads Mode: solo, Sizes: `size:S/M/L` labels, Laws: none. 42 is blocked by 41 on GitHub, `spp status 40 --json` prints an empty `cycle`, and `spp lint ticket` prints `ok` for both.

Check the set and tell me what you find before you release anything.
