---
"@syn54x/spp": patch
---

A fix round now writes its first progress comment with `--by "implement-issue fix round"`, so spp records the round as a run under that step. Before this, the run counter never saw fix rounds, and the grouped `fix-regression` issue reported "over 0 recorded runs".
