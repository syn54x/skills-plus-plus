---
"@syn54x/spp": minor
---

In the Claude desktop app, `/build` now asks which Driver to use when you approve an Epic's first Wave, since desktop linked sessions start each later Wave only on a message from you. `spp plan <epic> --driver desktop|bg|subagent` records the choice and `spp next` reports it on `dispatch`, so a resumed run reuses it.
