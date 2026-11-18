---
type: llm
focus: trace
---

The session was asked to start the `spp:reviewer` agent once with a probe prompt. A probe has to go through the Agent tool, because an agent run as the main session preloads nothing.

PASS if the trace shows one Agent tool call whose `subagent_type` is `spp:reviewer`.

FAIL if no Agent call with `subagent_type` `spp:reviewer` was made.
