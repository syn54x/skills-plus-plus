# Epic 40: See a month of recurring bills

## Problem

People set up recurring bills (rent every month, a cleaner every week) and record a payment each time they pay one. Nothing shows a whole month at once, so they cannot tell which bills are behind.

## Requirements

1. The server returns a summary of a month: every active bill series with its name, amount, anchor date, cadence and how far it has been paid, and the total still due in that month.
2. The web app shows a month view that lists every occurrence of every series in that month, each with its date, its amount and its state: paid, due or overdue.
3. The month view shows the total still due above the list.

## Implementation Decisions

- The server owns bill series and payments, in the `bill_series` and `payments` tables. The web app stores neither.
- Amounts are integer cents.
- A series has a cadence of `weekly` or `monthly`, counted from its anchor date.

## Testing Decisions

- Server code is tested through its routes, against a test database.
- Web code is tested with the project's component test runner.

## Out of Scope

- Editing a series or recording a payment from the month view.
- Cadences other than weekly and monthly.
