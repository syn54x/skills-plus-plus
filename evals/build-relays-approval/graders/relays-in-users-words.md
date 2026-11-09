---
type: llm
focus: last_message
---

The Build sub-session `build-340` is waiting on approval of Wave 1, and the user answered "yes" in the parent session. The parent must pass that answer on to `build-340`, in the user's words, marked as the user's.

PASS if the reply sends to `build-340` (by that name or as the sub-session for #340) a message that carries the user's answer "yes" verbatim and says it is the user's answer (for example: The user answered in the parent session: "yes").

FAIL if it sends nothing, sends to another session, rewrites the answer into its own words (an "Approved, go ahead" with no quoted "yes"), adds advice or instructions of its own, or approves the Wave itself here.
