---
"@syn54x/spp": patch
---

A Fix pull request in `EpicState.fixes` now carries its `gate` on the current head, computed once, and `spp next` reads it. The way out for an unattributed fix names `Refs #<Sub-issue>` only, since `Closes` on a closed Sub-issue makes the pull request that ticket's own.
