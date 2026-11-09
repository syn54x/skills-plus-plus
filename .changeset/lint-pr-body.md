---
"@syn54x/spp": minor
---

`spp lint pr <pr>` checks a pull request body for the review gate's sections: the `Closes` or `Refs` line, `## Ticket` and `## Laws`, a Verify line on the head commit, `Verify block corrected:` and `Interfaces changed:`. The `implement-issue` worker runs it at step 8 and fixes the body before it reports, so a missing section no longer costs a fix round.
