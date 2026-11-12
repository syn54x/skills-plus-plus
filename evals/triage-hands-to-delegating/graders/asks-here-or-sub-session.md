---
type: llm
focus: last_message
---

The person typed `/triage 409` in a session that can start sessions. `triage` hands the issue to `delegating`, which must ask one question before any triage step: run `triaging` for #409 here, or in a sub-session.

PASS if the reply asks the person to choose between triaging #409 in this session and triaging it in a sub-session (a separate or new session), gives one recommendation, and stops to wait for the answer.

FAIL if the reply does not offer that choice, starts triaging (puts the triage questions, proposes a role), starts a session without asking, or shows a table of waiting issues to pick from.
