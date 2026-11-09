---
type: llm
focus: last_message
---

This session has already started two other sessions, which marks it as an orchestrator, so the recommendation must be the sub-session.

PASS if the reply recommends exactly one option and that option is the sub-session, whether or not it gives the reason.

FAIL if it recommends building here, recommends both or neither, or leaves the choice without a recommendation.
