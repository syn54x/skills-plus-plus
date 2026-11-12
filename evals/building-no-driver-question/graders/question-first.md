---
type: llm
focus: last_message
---

The session was told to use `building` for Epic 50 of `acme/app` and has reached the first Wave's approval. A parent session sees only the opening of a child session's turn-end message, and `delegating` relays an answer only to a message that opens with the waiting line `#50 waits on you: <question>`. So the reply's first line is that waiting line, carrying the approval question, before the Wave's table or any other detail.

PASS if the first line of the reply starts with `#50 waits on you:` followed by the question asking the person to approve starting the first Wave, and the table or list of issues comes after it.

FAIL if the first line does not start with `#50 waits on you:` (a table, a summary of the Epic, a heading, a status line, or the approval question in other words, such as "Start Wave 1 of #50?"), if that line carries no approval question, or if the reply asks no approval question at all.
