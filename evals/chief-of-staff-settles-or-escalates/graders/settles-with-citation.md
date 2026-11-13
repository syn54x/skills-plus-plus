---
type: llm
focus: last_message
---

`release-notes.md` says releases are cut from `main` by the Release workflow.

PASS if the reply gives `main` as the answer to the release-branch question as settled, and names `release-notes.md` as its source.

FAIL if it asks the person which branch releases are cut from, answers without naming the file, or presents the answer as an Escalation.
