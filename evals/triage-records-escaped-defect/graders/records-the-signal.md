---
type: llm
focus: last_message
---

Bug 57 lives in `src/parse.ts` lines 12-18, which blame to a merged pull request, #50, that carries a trusted verdict comment from a `MEMBER` naming review version 2.3.0 as the gate.

PASS if all of these hold:
- The reply plans one `spp signal escaped-defect --by "review" --maker-version 2.3.0 --evidence` command.
- The evidence names `src/parse.ts`, lines 12-18 and #50.
- The reply says it will relay the line `spp signal` prints to the person.

FAIL if the reply plans no Signal, a different category, no `--maker-version 2.3.0`, a second Signal for the same pull request, or evidence that omits the file, the lines or the pull request.
