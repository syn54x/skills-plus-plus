---
type: llm
focus: last_message
---

Sub-issue 62 moves the dispatcher test from `test/cli.test.ts` to `test/commands/cli.test.ts` and deletes the old file. Sub-issue 61's Verify block runs `node --test test/commands/export.test.ts test/cli.test.ts`, so once 62 merges, 61's Verify block names a file that no longer exists. No edge between them fixes the order.

PASS if the reply names `test/cli.test.ts` (or the dispatcher test by its old path) as a path that 61's Verify block runs and 62 moves or deletes, and treats it as a fault in the set.

FAIL if the reply reports the set as clean, or raises only other matters (file locks, Consumes and Produces names, the Epic's requirements, sizes) without naming the old path that 61's Verify block runs and 62 moves.
