---
"mattpocock-skills": patch
---

`close-epic`'s retro (`sdd-retro.sh`) now reads each epic-level measure from the **Marker comment**'s data trailer when one is present: the integration branch from the plan trailer's `branch`, edges added and the second source of the ticket-to-PR map from the wave trailer's `waves`, and the panel block from its `panel` rounds. A comment with no trailer, or one that does not decode, falls back to the prose regexes as before (an undecodable one is named in `not_found` as `wave trailer: unreadable` or `plan trailer: unreadable`), so epics built before the trailer report the same numbers. The retro JSON keys and shapes are unchanged. `RETRO.md` shows the trailer read first and names the fallback.
