---
"@syn54x/spp": patch
---

`spp findings merge` counts one defect once when review-panel Personas title it differently: findings on one file within five lines merge whatever their titles, the body lists each other title as an `Also reported as:` line, and a `ticket-mandated:`, `Candidate ADR:`, `Check after deploy:` or `Terminology` title merges only with its own tag. With `--fix-diff`, a merged finding counts as on a changed line when any finding it absorbed was.
