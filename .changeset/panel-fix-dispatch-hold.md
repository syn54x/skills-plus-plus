---
"@syn54x/spp": patch
---

`spp next` and `spp wave plan` take `--started <tickets>`: the ready tickets whose workers the build started and that have not claimed yet count as in flight, so neither command dispatches them again, and a ready ticket that overlaps one is held. Without the flag nothing is held that way. `building` keeps that list and passes it on every `spp next`, and starts each worker's Agent description with `t-<N>`, so the Epic board links the worker to its row. The board's worker entries drop their `kind` field, and a failing agent list read shows as `agent list: <message>`.
