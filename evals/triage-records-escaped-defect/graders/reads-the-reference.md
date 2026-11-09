---
type: llm
focus: trace
---

The trace for an escaped defect lives in a reference file of the triage skill, not in the model's memory.

PASS if the trace shows the triage skill being loaded and `ESCAPED-DEFECT.md` being read before the reply plans its commands.

FAIL if `ESCAPED-DEFECT.md` was never read.
