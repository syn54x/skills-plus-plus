---
name: grill
description: Question my plan or design until we agree on every choice in it, recording settled terms in the glossary and hard decisions as ADRs along the way.
disable-model-invocation: true
metadata:
  credits:
    - skill: grill-with-docs
      author: Matt Pocock
      url: "https://github.com/mattpocock/skills/tree/main/skills/engineering/grill-with-docs"
---

Grill the person on the subject they named after `/grill`, or on the plan in the conversation so far when they named none.

Call the Skill tool twice, for "grilling" and "domain-modeling". Run the interview by `grilling`, and apply `domain-modeling` throughout it: challenge each term against the glossary, write a term the moment it is settled, and offer an ADR the moment a decision clears its bar.

When the person confirms the shared understanding, end by naming the next step: for a plan that will become an Epic, ask them to run `/to-spec` in this same conversation, since the spec is written from it.
