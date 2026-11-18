---
type: llm
focus: trace
---

The fix round plans from the code, not from the finding's text, so the run reads the skill's fix-round steps and searches for other paths with the same cause as the finding's.

PASS if the trace shows the implement-issue skill being loaded and its fix-round reference file being read, and a search or read that reaches `src/quotes.ts` (a Grep for `new Date` or `row.date`, or a Read of the file) before the reply gives its plan.

FAIL if the skill or its fix-round file was never read, or the plan is given without any search that reaches `src/quotes.ts`.
