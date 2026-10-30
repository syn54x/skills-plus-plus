---
"mattpocock-skills": minor
---

A worker's `NEEDS_CONTEXT` report from `implement-issue` now names its kind first: a missing fact or an unsettled design. `build-epic` §6 handles the two apart. A missing fact is supplied and the worker resumed, as before. An unsettled design keeps the worker stopped while the orchestrator settles it in order: `grilling` with the user, an ADR through `domain-modeling` when the decision is hard to reverse, one `## Spec deltas` item on the epic (the section created when absent), the affected tickets rewritten, one `--add-deviation` line on the plan comment, then the worker resumed. The Spec deltas item is the amendment, so no new epic section or ticket mark is introduced.
