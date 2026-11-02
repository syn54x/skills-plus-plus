---
type: llm
focus: last_message
---

The reply is the first round of an interview about the refund plan.

PASS if all of these hold:
- It asks several questions at once, as one numbered list, not one question at a time.
- Every question carries a recommended answer that the person could accept by replying "yes" or the item's number. A short note of context or a caveat inside an item is fine.
- It stops after asking and waits for the person. It does not answer its own questions or declare the plan finished. Saying that some questions are held for a later round is fine.

FAIL if it asks a single question, leaves any question without a recommended answer, writes a finished spec or plan, or treats a choice as decided without the person.
