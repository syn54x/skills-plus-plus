---
"mattpocock-skills": patch
---

`close-epic`'s retro now counts a panel fix slice as its ticket's PR through the slice's `Refs #<ticket>` line, so a fix slice's failed reviews reach the fix-round total and the by-cause breakdown. Before, only a closing line mapped a PR to its ticket, and a fix slice cannot close a ticket that is already closed. `build-epic` §7 now tells each fix slice to open its PR body with that line and name the panel finding, and the retro's Reading-it table gains a row for the `skill` cause.
