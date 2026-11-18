# Sub-issue 62: Group the tests by command

Labels: `size:S`

## Parent

Epic 60: Export notes as Markdown

## Blocked by

None

## What to build

Move each existing test file into `test/commands/`, one file per command, so the tests for a command sit under its name. The end-to-end dispatcher test `test/cli.test.ts` moves to `test/commands/cli.test.ts`, and `test/list.test.ts` and `test/search.test.ts` move beside it. Once it merges, `ls test/commands` shows one file per command and `npm test` runs the same tests as before.

## Acceptance criteria

- [ ] `test/cli.test.ts`, `test/list.test.ts` and `test/search.test.ts` no longer exist.
- [ ] `test/commands/cli.test.ts`, `test/commands/list.test.ts` and `test/commands/search.test.ts` hold their tests unchanged, apart from relative import paths.
- [ ] The `test` script in `package.json` runs `node --test test/commands/`.

## Files owned

Create: `test/commands/cli.test.ts`
Create: `test/commands/list.test.ts`
Create: `test/commands/search.test.ts`
Delete: `test/cli.test.ts`
Delete: `test/list.test.ts`
Delete: `test/search.test.ts`
Modify: `package.json`

## Interfaces

Consumes: none
Produces: none

## Test scenarios

- `npm test` reports the same number of passing tests before and after the move.
- No file is left directly under `test/`.

## Verify

```bash
npm test
test ! -e test/cli.test.ts
```
