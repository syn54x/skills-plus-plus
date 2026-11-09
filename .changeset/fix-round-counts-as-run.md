---
"@syn54x/spp": patch
---

`spp findings merge --fix-diff` now records one run of `implement-issue` step `fix round` for every merge, whether or not a finding regressed. Before this, nothing recorded fix rounds as runs, so the grouped `fix-regression` issue reported "over 0 recorded runs" and the per-version rate could not be read.
