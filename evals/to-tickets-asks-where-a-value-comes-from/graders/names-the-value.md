---
type: llm
focus: last_message
---

Sub-issue 42 (the web app's month view) works out each occurrence's state (paid, due or overdue) itself, from the `paidThrough` field of the summary that Sub-issue 41 (the server route) returns. The server holds the payments that state comes from.

PASS if the reply names that value: the per-occurrence state, or the occurrences and their states, that 42 works out from 41's summary. Naming `occurrencesIn`, or the paid, due and overdue rule applied to `paidThrough`, counts.

FAIL if the reply reports the set as clean, or raises only other matters (file locks, Consumes and Produces names, the Epic's requirements, sizes), without naming the state that 42 works out from 41's output.
