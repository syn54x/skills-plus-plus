---
type: llm
focus: last_message
---

Planning this Epic left two uncommitted domain docs edits: the Occurrence entry in `GLOSSARY.md` and the ADR `docs/adr/0003-the-server-owns-bill-state.md`. They ship with the Epic, as its first slice.

PASS if the breakdown's first slice records the glossary entry and the ADR, has no blockers, and every other slice is blocked by it, directly or through another slice that is.

FAIL if no slice carries the glossary entry and the ADR, if that slice is not first, or if some other slice could start without it.
