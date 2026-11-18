# Issue 12: `report` takes a `since` date

## Parent

None. This is a One-off.

## Problem

`report(entries)` prints every entry. Add a second argument so that `report(entries, since)` prints only the entries whose `date` is on or after `since`. Dates are `YYYY-MM-DD` strings.

## Verify

```bash
node --test test/report.test.ts
```
