---
type: llm
focus: trace
---

PASS if the trace shows both of these before the final reply: `PERSONAS.md` read from `spp-panel-60`, and the `tdd` skill loaded through the Skill tool (a Skill call whose skill name is `tdd`, with or without a plugin prefix).

FAIL if either is missing, or if the Skill call comes only after the reply was written.
