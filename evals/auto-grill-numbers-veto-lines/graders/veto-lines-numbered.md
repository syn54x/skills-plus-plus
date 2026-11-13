---
type: llm
focus: last_message
---

The reply is a stop in an interview about how a subscription's price change should work. It may bring Escalations, Challenges and a veto list: one line per answer the agent gave in the person's name, each with a pointer to its source.

Judge the veto list in the reply.

PASS if all of these hold:
- Every veto line opens with a handle `V1`, `V2` and so on, numbered across the whole list in order with no gap and no repeat.
- Every line that departs from common practice (it says what comparable products do and gives a reason for leaving that approach) comes before every line that does not.

FAIL if no veto line departs from common practice, since the second rule then has nothing to check. FAIL if any veto line has no handle, the numbers skip or repeat, or a line that departs from common practice comes after one that does not. FAIL too if the reply has no veto list.
