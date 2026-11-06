# Sub-issue 41: Return a month's summary of recurring bills

Labels: `size:S`

## Parent

Epic 40: See a month of recurring bills

## Blocked by

None

## What to build

A route that returns the summary of one month: every active bill series with how far it has been paid, and the total still due in that month. Once it merges, `GET /api/bills/summary?month=2026-03` answers with March's series and total.

## Acceptance criteria

- [ ] `GET /api/bills/summary?month=YYYY-MM` returns a `MonthSummary` holding every active series.
- [ ] Each series carries its name, amount in cents, anchor date, cadence and `paidThrough`: the date of the latest occurrence with a payment recorded against it, or `null` when none is paid.
- [ ] `totalDueCents` is the sum of the unpaid occurrences that fall in the month.
- [ ] A month that is not `YYYY-MM` gets a 400.

## Files owned

Create: `server/bills/summary.ts`
Modify: `server/routes.ts`
Test: `server/bills/summary.test.ts`

## Interfaces

Consumes: none
Produces: `GET /api/bills/summary?month=YYYY-MM` returning `MonthSummary`, consumed by 42

```ts
type SeriesSummary = {
  id: string;
  name: string;
  amountCents: number;
  anchorDate: string; // YYYY-MM-DD
  cadence: "weekly" | "monthly";
  paidThrough: string | null; // YYYY-MM-DD
};
type MonthSummary = { month: string; series: SeriesSummary[]; totalDueCents: number };
```

## Test scenarios

- A monthly series anchored on 2026-01-05 with payments for January and February returns `paidThrough: "2026-02-05"` for March.
- A series with no payment returns `paidThrough: null`.
- Two series each owing 5000 cents in March return `totalDueCents: 10000`.
- `month=March` returns 400.

## Verify

```bash
npm test -- server/bills/summary.test.ts
```
