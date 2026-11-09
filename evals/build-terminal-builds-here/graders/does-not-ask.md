---
type: llm
focus: trace
---

The person typed `/build 340` in a terminal, where no session can be started. The build must not ask where to run, and must start the `building` skill here, whose first step runs `spp kind` on the issue.

PASS if the trace holds a Skill tool call for `building` (bare, or as `spp:building`), and the final reply asks for `spp kind` on issue 340 (or its URL) without asking whether to run here or in a sub-session.

FAIL if any reply offers a choice between here and a sub-session (or a new or separate session), if no Skill tool call starts `building`, or if the run tries to start a session.
