---
type: llm
focus: trace
---

The body lint comes from the implement-issue skill's step 8, so the run loads the skill before the reply tells the worker what to do.

PASS if the trace shows the implement-issue skill being loaded before the reply names `spp lint pr`.

FAIL if the skill was never loaded, or the reply names the lint without the skill having been read.
