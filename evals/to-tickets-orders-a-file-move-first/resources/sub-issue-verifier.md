# Sub-issue 61: Export notes as Markdown files

Labels: `size:M`

## Parent

Epic 60: Export notes as Markdown

## Blocked by

None

## What to build

A new `export` command. `notes export 12` writes note 12 to `<title>.md` in the current folder, and `notes export --all` writes every note. Once it merges, running `notes export --all` in an empty folder fills it with one Markdown file per note.

## Acceptance criteria

- [ ] `notes export <id>` writes one file named after the note's title, with the title as an H1 and the body below it.
- [ ] `notes export --all` writes one file per note.
- [ ] An unknown id prints `no note <id>` and exits 1.
- [ ] `notes help` lists `export`.

## Files owned

Create: `src/commands/export.ts`
Modify: `src/cli.ts`
Test: `test/commands/export.test.ts`

## Interfaces

Consumes: none
Produces: none

## Test scenarios

- A note titled `Groceries` with body `eggs` exports to `Groceries.md` holding `# Groceries` then `eggs`.
- `--all` over three notes writes three files.
- `notes export 99` with no note 99 prints `no note 99` and exits 1.
- The dispatcher test still passes with `export` added.

## Verify

```bash
node --test test/commands/export.test.ts test/cli.test.ts
```
