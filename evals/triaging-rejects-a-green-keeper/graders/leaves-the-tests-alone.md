---
type: llm
focus: trace
---

A green Keeper ends the issue, and triage touches no code.

PASS if the trace holds a Skill tool call for `triaging` (bare, or as `spp:triaging`), no Skill tool call for `harden`, and no Write or Edit call on a path under `shop/` or `tests/`.

FAIL if `triaging` was never loaded, if `harden` was called, or if any Write or Edit targeted a path under `shop/` or `tests/`.
