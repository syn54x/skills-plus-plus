# Issue 12: 'deleted' becomes 'archived'

## Parent

None. This is a One-off.

## Problem

The word "deleted" is wrong for what `deleteEntry` does: it hides an entry from the report and keeps it in the store. Rename `deleteEntry` to `archiveEntry`, and let the word "deleted" leave the code and the glossary.

## The plan

The glossary entry to write:

```
**Archived entry**: An entry hidden from the report and kept in the store.
_Avoid_: deleted entry, removed entry
```

A proposed Test scenario:

- Happy path: archive entry 2, then add an entry → the new entry takes id 2

A proposed Verify block:

```bash
node --test test/store.test.ts
! git grep -qi deleted -- src test GLOSSARY.md
```
