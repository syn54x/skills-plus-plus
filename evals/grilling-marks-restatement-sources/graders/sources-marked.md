---
type: llm
focus: last_message
---

The reply is the closing restatement of an interview about archiving wiki pages, where the person decided items 1.1 to 1.3 and left how long an archived page is kept undecided.

PASS if all of these hold:
- The restatement is a list, one line of the plan per item.
- Every line ends with its source: the person (naming the Round and item, such as 1.2), the record (with a pointer), or the agent's inference.
- Any line the person did not decide, such as how long an archived page is kept, sits last under its own label that asks the person to check it.
- It ends by asking the person to confirm the restatement, and builds nothing.

FAIL if any line has no source, an undecided line is mixed in among the person's decisions or attributed to the person, or the reply writes a spec, code or a plan file instead of asking for confirmation.
