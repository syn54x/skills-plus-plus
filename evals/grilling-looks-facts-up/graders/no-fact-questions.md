---
type: llm
focus: last_message
---

The webhook sender notes already state the delivery timeout, that there are no retries today, that the queue is in-process, and who receives the webhooks.

PASS if the reply uses those facts as settled (it may cite or build on them) and asks only about choices the notes cannot answer, such as the backoff shape, the retry limit, or what happens to a delivery that never succeeds.

FAIL if any question asks the person for one of the facts the notes state, such as the current timeout, whether retries exist, or who the consumers are.
