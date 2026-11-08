---
"@syn54x/spp": minor
---

`spp signal <category> --by "<skill> [step]" --evidence "<text>"` records a Signal, a correction charged to the skill step and plugin version that made the corrected work, in a per-repo Signal log beside the notes log. It records only in an Attended session, never under `CI`, and never when the repo's Self-improvement mode is Off. `spp feedback pending` lists the recorded Signals grouped by skill step and category.

The Routing block's `Self-improvement mode:` line (`Off`, `Anonymous` or `Full Detail`) replaces `Upstream feedback:`. An old line still works: `off` reads as Off, `counts` and `detailed` as Anonymous, and `attributed` as Full Detail. `spp preflight --json` now prints `selfImprovement` in place of `upstreamFeedback`.
