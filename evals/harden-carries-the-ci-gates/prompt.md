---
description: Hardening an issue, harden puts the type-check and lint commands the repo's CI runs into the Verify block, beside the issue's own test run.
max_turns: 20
allowed_tools: [Read, Glob, Grep, Skill]
---

/spp:harden 12

Harden issue 12 of this project. You have no shell in this session, so the issue's text is the file `issue.md`, the code and tests are the files under `src/` and `test/`, and the repo's tooling is `package.json` and `.github/workflows/ci.yml`. The repo is on the spp flow: its Routing block reads Mode: solo, Sizes: `size:S/M/L` labels, Laws: none. Do not edit the issue or run the lint; reply with the full contract you would write.
