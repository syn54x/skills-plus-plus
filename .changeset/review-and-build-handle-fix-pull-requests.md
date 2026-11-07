---
"@syn54x/spp": minor
---

The `review` skill now gates a Fix pull request: one with no closing line that opens `Refs #N` for a Sub-issue and targets its Epic's integration branch gets both verdicts, the Sub-issue's Verify block, and a verdict marker recorded with `spp verdict --ticket N`. `build`'s Main gate follows `spp next` for fixes (`gate`, `fix`, `merge` or `hand-back`) and `spp merge` merges them, so the orchestrator no longer merges a fix by hand.
