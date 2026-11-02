---
description: Grill writes a term into the glossary the moment the person settles it, without being asked to.
max_turns: 15
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit]
---

/spp:grill our scheduling vocabulary. The project is at `evals/grill-records-glossary-term/resources/` in the spp plugin's directory. "Slot" means two things in our docs, and I've decided which one wins: a Slot is one bookable block of a technician's day, at most two hours long. Anything longer is a Job, made of consecutive Slots.
