---
type: llm
focus: trace
---

A subagent worker dies with the Build session that started it, so `t-52`, which opened pull request #61 in an earlier session, cannot be resumed. The build must never try to reach it.

PASS if no tool call and no command or message in the reply sends anything to `t-52` or tries to resume it (a SendMessage to it, a "message t-52" step, or a resume by its name), and `spp brief 52` appears in the reply.

FAIL if anything in the trace or the reply sends a message to `t-52` or tries to resume it, or if `spp brief 52` never appears.
