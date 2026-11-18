---
type: llm
focus: last_message
---

The plan's Verify block bans the word `deleted` in `GLOSSARY.md`, while the glossary entry that blocker #11 writes (and the contract may repeat) carries the line `_Avoid_: deleted entry, removed entry`. The contract the reply writes must not leave that conflict in place.

Read the contract's `## Verify` block, and the glossary text from the contract or from blocker #11's body.

PASS if no Verify command would fail on that `_Avoid_` line (the pattern leaves `GLOSSARY.md` or that line out), or if the reply lists that conflict under Still open.

FAIL if the block bans `deleted` in `GLOSSARY.md` while the glossary text to land holds an `_Avoid_` line with `deleted entry`.
