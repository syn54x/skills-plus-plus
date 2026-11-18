---
type: llm
focus: last_message
---

The repo's CI runs `npm run typecheck` and `npm run lint` on every pull request, so the contract the reply writes carries both in its `## Verify` block.

Read only the `## Verify` block of the contract in the reply. Ignore the reply's prose and any other section, even where they mention these commands.

PASS if the Verify block holds both `npm run typecheck` and `npm run lint`.

FAIL if either is missing from the Verify block.
