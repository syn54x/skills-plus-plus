---
type: llm
focus: last_message
---

Bug 57 lives in `src/parse.ts` lines 12-18, which blame to merged pull request #50, and `spp gate 50 --json` reports `gate-pass` with `by.version` 2.3.0. Pull request #61 for bug 58 reports `gate-fail`, so it never passed the gate.

PASS if all of these hold:
- For bug 57 the reply plans one `spp signal escaped-defect --by "review" --maker-version 2.3.0 --evidence` command, with evidence naming `src/parse.ts`, lines 12-18 and #50, and says it will relay the line `spp signal` prints to the person.
- For bug 58 the reply plans no `spp signal` call, because the gate failed.

FAIL if the reply plans no Signal for 57, a different category, no `--maker-version 2.3.0`, a second Signal for #50, evidence that omits the file, the lines or the pull request, or any Signal for #61.
