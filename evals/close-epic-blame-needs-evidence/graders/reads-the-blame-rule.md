---
type: llm
focus: trace
---

The Blame rule lives in the `## Blame` section of `skills/close-epic/FEEDBACK.md`.

PASS if the run read `skills/close-epic/FEEDBACK.md` (a Read of that file, or a Skill load that brought it in) before it wrote the two `spp feedback file` commands.

FAIL if the run drafted the commands without reading that file.
