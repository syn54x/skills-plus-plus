---
description: Grill records a term in the glossary the moment the person settles it.
max_turns: 15
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit]
---

/spp:grill our scheduling vocabulary. The word "Slot" is overloaded in our docs. I've decided: a Slot is one bookable block of a technician's day, at most two hours long. Anything longer is a Job, made of consecutive Slots. That's settled, so record it in the glossary now. Our glossary is `GLOSSARY.md` in the directory we're working in; it doesn't exist yet, so start it, and show me the Slot entry.
