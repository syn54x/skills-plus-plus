---
type: llm
focus: last_message
---

The reply is the first Round of an interview about archiving wiki pages.

PASS if all of these hold:
- It asks several questions as one numbered list.
- Every question lists its options on separate lines, each under a capital letter (`A:`, `B:` and so on), with the recommended option first and marked as recommended.
- Every question has a `Rests on:` line naming the assumption its recommendation depends on.
- The Round ends by saying it can be answered with letters (such as `1A 2B`) or with `all` to take every recommendation, and that a caveat may follow a letter.
- It stops and waits for the person, deciding no choice itself.

FAIL if any question writes its options into a sentence instead of lettered lines, puts the recommendation anywhere but first, lacks a `Rests on:` line, the closing line on answering by letters is missing, or it decides a choice without the person.
