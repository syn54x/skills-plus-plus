# Issue 12: 'deleted' becomes 'archived'

## Parent

None. This is a One-off.

## Blocked by

#11, the domain docs slice. Its body is the file `blocker-11.md`; it is still open.

## Problem

The word "deleted" is wrong for what `deleteEntry` does: it hides an entry from the report and keeps it in the store. Rename `deleteEntry` to `archiveEntry`, and let the word "deleted" leave the code and the glossary. #11 writes the glossary entry, including its `_Avoid_: deleted entry, removed entry` line.

## The plan

A proposed Test scenario:

- Happy path: archive entry 2, then add an entry → the entry list shows ids 1 and 2 again

A proposed Verify block:

```bash
node --test test/store.test.ts
! git grep -qi deleted -- src test GLOSSARY.md
```
