---
type: llm
focus: last_message
---

The plan's Verify block bans the word `deleted` in `GLOSSARY.md`, while the glossary entry the contract mandates carries the line `_Avoid_: deleted entry, removed entry`. The contract the reply writes must not leave that conflict in place.

Read the contract's `## Verify` block and the glossary text the contract mandates.

PASS if no Verify command would fail on the mandated `_Avoid_` line (the pattern leaves `GLOSSARY.md` or that line out), or if the reply lists that conflict under Still open.

FAIL if the block bans `deleted` in `GLOSSARY.md` while the contract mandates an `_Avoid_` line holding `deleted entry`.
