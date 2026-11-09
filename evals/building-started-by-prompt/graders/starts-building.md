---
type: llm
focus: trace
---

The session was told to use `building` for issue 50 of `acme/app`, an Epic, and no slash command was typed. The `building` skill's first step runs `spp kind` on the issue it was given.

PASS if the trace holds a Skill tool call for `building` (bare, or as `spp:building`) and, after it, the reply asks for `spp kind` on issue 50 (`spp kind 50`, or the issue's URL) as the first command to run.

FAIL if no Skill tool call starts `building`, if the run starts `build` instead, or if the first command the reply asks for is anything other than `spp kind` on issue 50 (a `spp next`, a `spp dispatch` or a worker start, say).
