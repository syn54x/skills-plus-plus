---
type: llm
focus: trace
---

The fix round plans from the code, not from the findings' text, so the run reads the skill's fix-round steps and searches for the callers of the function it is about to change.

PASS if the trace shows the implement-issue skill being loaded and its fix-round reference file being read, and a search or read that reaches `src/refund.ts` (a Grep for `parseAmount`, or a Read of the file) before the reply gives its plan.

FAIL if the skill or its fix-round file was never read, or the plan is given without any search for `parseAmount`'s callers.
