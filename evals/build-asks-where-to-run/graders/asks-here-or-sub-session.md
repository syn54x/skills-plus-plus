---
type: llm
focus: last_message
---

The person typed `/build 340` in a session that can start sessions, and `spp kind 340` says #340 is an Epic. Once the kind is read, the build must ask one question before anything else: run the build here, or in a sub-session.

PASS if the reply asks the person to choose between building #340 in this session and building it in a sub-session (a separate or new session), and stops to wait for the answer. It may say why it recommends one, and it may mention the kind it read.

FAIL if the reply does not offer that choice, starts building (plans a Wave, starts a worker), starts a session without asking, or asks something else first.
