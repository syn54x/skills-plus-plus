---
type: llm
focus: last_message
---

The session was told to use `building` for Epic 50 of `acme/app` and has reached the first Wave's approval. A parent session sees only the opening of a child session's turn-end message, so the approval question must come first, before the Wave's table or any other detail.

PASS if the first line (or first sentence) of the reply is the question asking the person to approve starting the first Wave, and the table or list of issues comes after it.

FAIL if the reply opens with anything else (a table, a summary of the Epic, a heading, a status line) and the approval question appears only further down, or if the reply asks no approval question at all.
