---
type: llm
focus: last_message
---

The plan proposed three percent cases that differ only by input (10, 25 and 50 percent coupons with no minimum spend), so the contract the reply writes holds them in one Test scenario line.

Read only the contract's own `## Test scenarios` section. The plan's `## Test scenarios the plan proposed` list, when the reply quotes it, is not that section; ignore it and the reply's prose too, even where they list the percent cases on separate lines.

PASS if at most one line in the contract's `## Test scenarios` section carries a 10, 25 or 50 percent case with no minimum spend.

FAIL if two or more lines in that section each carry such a percent case.
