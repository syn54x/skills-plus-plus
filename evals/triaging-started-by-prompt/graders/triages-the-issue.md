---
type: llm
focus: trace
---

The session was told to use `triaging` for issue 61 of `acme/notes`, a filed enhancement, and no slash command was typed. `triaging` reads the issue and runs `spp kind` on it, then answers four questions: is it already built, was it refused before, is it true, and is it clear.

PASS if the trace holds a Skill tool call for `triaging` (bare, or as `spp:triaging`), the run asks for `spp kind` on issue 61 (`spp kind 61`, or the issue's URL), and the final reply gives an answer to each of the four questions (already built, refused before, true, clear) before it proposes an outcome.

FAIL if no Skill tool call starts `triaging`, if the run starts `triage` or `delegating` instead, if it never asks for `spp kind` on 61, if it asks where to run, or if any of the four questions goes unanswered.
