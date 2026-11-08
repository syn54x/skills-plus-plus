---
"@syn54x/spp": patch
---

A worker now inherits the attended decision from the session that started it. `spp dispatch` records, for each issue it starts, whether that session is attended, and a worker on the issue's `sdd/<N>-...` branch records Signals by that decision even when its own environment reads unattended, as a `claude --bg` session may. A dispatch run under `CI` starts workers that record nothing.
