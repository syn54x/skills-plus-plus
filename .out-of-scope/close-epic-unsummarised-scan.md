# A no-argument `close-epic` scan for unsummarised epics

`close-epic` takes one epic (`/close-epic <epic#>`). It will not grow a no-argument mode that finds every closed epic without a `<!-- sdd-summary -->` comment and lists or closes them.

## Why this is out of scope

The scan answers a problem nobody has hit. `build-epic`'s close-out ends by telling the user to run `close-epic` once the PR to `main` merges, and says that it can run in any later session from GitHub state alone, so a forgotten epic is one command away whenever someone notices. No reported session has left an epic unsummarised, and an observed failure is the first part of the bar in [`SCOPE.md`](../SCOPE.md).

The scan would also cost more than it looks. In labels-only mode an epic carries no durable marker: `needs-plan` comes off once the plan is posted, and only org mode sets the `Epic` type. Finding epics would need either a new permanent `epic` label that `to-tickets` and `setup-syn54x-skills` both have to maintain, or a comment search across every closed issue in the repo. Either is permanent surface for a convenience.

If epics do start going unsummarised in practice, that is an observed failure and a fresh issue clears the bar.

## Prior requests

- #15: "close-epic: no-argument scan for closed epics with no summary"
