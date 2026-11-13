---
type: llm
focus: last_message
---

The reply is the closing restatement of an interview about archiving wiki pages, where the person answered items 1.1 to 1.4.

PASS if all of these hold:
- The restatement is a list, one line of the plan per item.
- Every line ends with its source: the person (naming the Round and item, such as 1.2), the record (with a pointer), or the agent's inference.
- Any line the person did not decide sits last, under its own label that asks the person to check it. A restatement with no such line passes this check.
- It ends by asking the person to confirm the restatement, and builds nothing.

FAIL if any line has no source, a line the person did not decide is mixed in among their decisions or attributed to them, or the reply writes a spec, code or a plan file instead of asking for confirmation.
