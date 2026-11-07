---
type: llm
focus: last_message
---

A fix is judged and recorded against the Sub-issue it refs.

PASS if the reply says it will run issue 41's Verify block (through `spp verify 41`) and record the verdict with `spp verdict` and `--ticket 41`.

FAIL if the reply records no verdict marker, runs no Verify block, or names no Sub-issue.
