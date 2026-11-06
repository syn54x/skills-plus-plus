# Sub-issue 42: Show a month of bills with each one's state

Labels: `size:M`

## Parent

Epic 40: See a month of recurring bills

## Blocked by

41

## What to build

The month view in the web app. It fetches the month's summary and lists every occurrence of every series in that month with its date, amount and state, under the total still due. Once it merges, opening `/bills/2026-03` shows March's bills, each marked paid, due or overdue.

The summary lists series, not occurrences, so `occurrencesIn` works the occurrences out: it steps each series from its `anchorDate` by its `cadence` to find the dates that fall in the month, then gives each date a state from the series' `paidThrough`. A date on or before `paidThrough` is `paid`; a later date before today is `overdue`; any other is `due`.

## Acceptance criteria

- [ ] `/bills/YYYY-MM` lists every occurrence of every active series in that month, in date order.
- [ ] Each row shows the series name, the date, the amount and one state: paid, due or overdue.
- [ ] The total still due shows above the list.
- [ ] A weekly series shows four or five rows in a month, and a monthly series one.

## Files owned

Create: `web/bills/MonthList.tsx`
Create: `web/bills/occurrences.ts`
Modify: `web/routes.tsx`
Test: `web/bills/occurrences.test.ts`
Test: `web/bills/MonthList.test.tsx`

## Interfaces

Consumes: `GET /api/bills/summary?month=YYYY-MM` returning `MonthSummary`, from 41
Produces: none

## Test scenarios

- A monthly series anchored on 2026-01-05 with `paidThrough: "2026-02-05"`, viewed on 2026-03-10, gives one March row dated 2026-03-05 with state overdue.
- The same series viewed on 2026-03-01 gives that row the state due.
- A weekly series anchored on 2026-03-02 with `paidThrough: "2026-03-09"` gives five March rows: two paid, then three due or overdue by today's date.
- A series with `paidThrough: null` has no paid row.
- The list renders the total from `totalDueCents`.

## Verify

```bash
npm test -- web/bills/occurrences.test.ts web/bills/MonthList.test.tsx
```
