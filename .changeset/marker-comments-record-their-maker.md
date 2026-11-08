---
"@syn54x/spp": minor
---

Every Marker comment spp writes now records who made it. Its data trailer's `by` names the skill (to-tickets for the plan comment, build for the wave comment, review for the verdict, implement-issue for the progress comment) and the plugin version, and the progress comment's `verifyPinBy` names the Verify pin's maker (harden, or triage when it re-pins). `spp plan`, `spp wave <epic> add|pr|panel`, `spp progress`, `spp verdict`, `spp hand-back` and `spp lint ticket --pin` take `--by "<skill> <step>"` to name another skill and the step. Comments written before this change carry no maker.
