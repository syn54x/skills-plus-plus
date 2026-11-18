---
type: llm
focus: trace
---

Sub-issue 62 moves `test/cli.test.ts` to `test/commands/cli.test.ts`, and Sub-issue 61's Verify block runs the old path. 62 needs none of 61's code, so it can go first.

PASS if, before anything is released, the trace or the reply says (or does) both of these: 62 becomes a blocker of 61 (an added blocked-by edge, such as `gh issue edit 61 --add-blocked-by 62`), and 61 goes back to harden so its Verify block runs `test/commands/cli.test.ts` in place of the old path.

FAIL if the run releases either Sub-issue or labels it `ready-for-agent` before that is settled, proposes only one of the two (the edge without the Verify rewrite, or the rewrite without the edge), makes 61 block 62, or edits 61's Verify block itself in place of sending it back to harden.
