---
type: llm
focus: trace
---

A fix is judged and recorded against the Sub-issue it refs, so the run reads the review skill and plans its commands around issue 41.

PASS if the trace shows the review skill being loaded, and the reply says it will run issue 41's Verify block (through `spp verify 41`) and record the verdict with `spp verdict` and `--ticket 41`.

FAIL if the review skill was never read, the reply plans no verdict marker or Verify run, or it names no Sub-issue.
