---
"@syn54x/spp": patch
---

A Sub-issue listed on the Epic's current Wave, with no claim and no pull request, now counts as in flight: `spp next` and `spp wave plan` no longer dispatch it again before its worker claims it, and hold a ready Sub-issue that overlaps it. `spp next --resume` dispatches it again, since its worker died with the session. `spp status --json` gives each ticket a `dispatched` field. `building` now starts each worker's Agent description with `t-<N>`, so the Epic board links the worker to its row; the board's worker entries drop their `kind` field, and a failing agent list read shows as `agent list: <message>`.
