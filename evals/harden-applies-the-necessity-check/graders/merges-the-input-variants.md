---
type: llm
focus: last_message
---

Scenarios 2, 3 and 4 of the plan (a 10 percent coupon on 100 gives 90, a 25 percent coupon on 80 gives 60, a 50 percent coupon on 60 gives 30) differ only by input.

PASS if the reply's Test scenarios hold those three cases in one scenario line, with their three totals (90, 60 and 30) listed in the same order as their inputs, and no other scenario line carries a percent case of 10, 25 or 50 percent without a minimum spend.

Read only the contract's own `## Test scenarios` section of the reply; if the reply quotes the issue's `## Test scenarios the plan proposed` list, ignore that quoted list.

FAIL if the three cases appear as separate scenario lines, or any of them is missing.
