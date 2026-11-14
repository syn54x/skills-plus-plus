---
description: Slicing an Epic whose planning changed the glossary and wrote an ADR, to-tickets makes those the first slice, blocking every other, and sends nothing to the default branch first.
max_turns: 15
allowed_tools: [Read, Glob, Grep, Skill]
---

/spp:to-tickets 40

You have no shell in this session, so the Epic's body is the file `epic.md` in this project, and it has no comments. The repo is on the spp flow, and its Routing block reads Mode solo, Sizes `size:S/M/L` labels, Laws `GLOSSARY.md` and `docs/adr/`. The grill for this Epic added the Occurrence entry to `GLOSSARY.md` and wrote `docs/adr/0003-the-server-owns-bill-state.md`. Both edits are uncommitted in this checkout, which is on the default branch.

Do steps 1 and 2: show me the numbered breakdown to approve. Create nothing yet.
