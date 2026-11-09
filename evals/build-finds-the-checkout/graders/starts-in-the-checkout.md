---
type: llm
focus: last_message
---

The person chose a sub-session from `~/work`. In the first case, exactly one folder one level down, `~/work/skills-plus-plus`, has a remote matching `syn54x/skills-plus-plus`. In the second, `~/work/spp-old` matches too, so there are two.

PASS if all of these hold:
- For the first case, the sub-session starts in `~/work/skills-plus-plus`, without a worktree of its own, with a prompt telling it to use `building` for #340 (the number or its URL).
- For the second case, the reply says it would ask the person which of the two folders to use, and would start no session until they answer.

FAIL if the first case starts in `~/work`, in `~/work/notes`, or in a new worktree; if its prompt runs `/build` or omits `building`; or if the second case picks a folder on its own or starts a session before asking.
