---
"@syn54x/spp": minor
---

`spp next` now routes an Epic's Fix pull requests the way it routes a slice: `gate` when its checks pass and its head has no verdict, `fix` once after a failed head (naming the failing runs when checks are the cause), `hand-back` naming the pull request after a second failed head, `merge` on a passing verdict, and `wait` while its checks are pending or its Sub-issue's worker is running. An unattributed fix is never gated or merged: it is reported under `wait`, or `stuck` when nothing else is in flight, with the way out (add `Refs #<Sub-issue>` to its body, or close it). `main-gate` now prints only once no fix is open. The action shape is unchanged.
