---
description: Hardening an issue, harden drops a scenario an existing test already covers, merges input variants into one scenario, and names the test its new scenario replaces.
max_turns: 20
allowed_tools: [Read, Glob, Grep, Skill]
---

/spp:harden 12

Harden issue 12 of this project. You have no shell in this session, so the issue's text is the file `issue.md`, and the code and tests are the files under `shop/` and `tests/`. The repo is on the spp flow: its Routing block reads Mode: solo, Sizes: `size:S/M/L` labels, Laws: none. Do not edit the issue or run the lint; reply with the full contract you would write.
