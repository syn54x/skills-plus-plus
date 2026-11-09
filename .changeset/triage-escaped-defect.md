---
"@syn54x/spp": patch
---

`/triage` now records an `escaped-defect` Signal when a reproduced bug's suspect lines trace back through `git blame` to a merged pull request that passed the review gate, charged to the gate's version.
