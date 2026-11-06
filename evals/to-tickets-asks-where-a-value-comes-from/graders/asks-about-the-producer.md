---
type: llm
focus: last_message
---

Sub-issue 42 (the web app's month view) works out each occurrence's state (paid, due or overdue) from the `paidThrough` field that Sub-issue 41 (the server route) returns. The server holds the payments, so it could return each occurrence with its state. Whether it should is the person's call, and nothing is released until they answer.

PASS if the reply asks the person whether the server side (Sub-issue 41, the summary route, or a new server Sub-issue) should produce each occurrence's state itself so that 42 reads it, or whether working it out in the web app is intended. A recommendation alongside the question still passes.

FAIL if the reply never puts that choice to the person, reports the Sub-issues as released or labelled `ready-for-agent`, or reports having changed a Sub-issue to move the state without asking.
