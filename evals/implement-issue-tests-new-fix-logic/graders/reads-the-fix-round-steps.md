---
type: llm
focus: trace
---

The fix round follows the skill's own steps, so the run reads them before it plans.

PASS if the trace shows the implement-issue skill being loaded and its fix-round reference file being read before the reply gives its plan.

FAIL if the skill or its fix-round file was never read, or the plan is given before they were.
