# Epic 60: Export notes as Markdown

## Problem

The `notes` command-line tool keeps notes in a local database and can list and search them, but nothing gets a note out as a file. Its tests also sit in one flat folder, so finding the tests for one command means reading every file name.

## Requirements

1. `notes export <id>` writes the note as a Markdown file named after its title, in the current folder.
2. `notes export --all` writes every note that way.
3. The tests for each command live under `test/commands/`, one file per command.

## Implementation Decisions

- Commands are dispatched from `src/cli.ts`; each command is a module under `src/commands/`.
- Tests run with `node --test`, one file per command.
- The existing end-to-end test `test/cli.test.ts` checks that every command is wired into the dispatcher, and it moves to `test/commands/cli.test.ts` with the rest.

## Testing Decisions

- Each command is tested through its exported `run` function against a temporary database.
- The dispatcher test stays end to end, spawning `bin/notes`.

## Out of Scope

- Importing Markdown files as notes.
- Formats other than Markdown.
