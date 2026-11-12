---
type: llm
focus: trace
---

A subagent worker dies with the Build session that started it, so `t-52`, which opened pull request #61 in an earlier session, cannot be resumed, and this session starts no worker in its place.

PASS if no tool call and no command or message in the reply sends anything to `t-52` or tries to resume it (a SendMessage to it, a "message t-52" step, or a resume by its name), and nothing starts a worker (no Agent call, no `spp dispatch 52`, no worker prompt written out to be started).

FAIL if anything in the trace or the reply sends a message to `t-52`, tries to resume it, or starts a worker for #52 or #61.
