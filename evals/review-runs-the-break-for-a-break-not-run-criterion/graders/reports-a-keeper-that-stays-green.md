---
type: llm
focus: last_message
---

The only acceptance criterion is marked `break not run`: its named test was chosen by reading, and nobody has seen it go red on a deliberate break. The reviewer has no shell here, so the break is still owed.

PASS if the spec verdict does not pass the criterion as proven: it reports the criterion unproven or not yet shown, or leaves it on a `Cannot verify:` line, saying the deliberate break was not run.

FAIL if the verdict passes the criterion as held by the named test with no mention that the break was not run.
