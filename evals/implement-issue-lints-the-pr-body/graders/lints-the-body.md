---
type: llm
focus: last_message
---

Step 8 of the skill has the worker run `spp lint pr <PR>` against its pushed body and fix every line the lint prints before step 9 reports. This body has no `## Laws` section and says `Verify block corrected: none`, so the lint fails on both, and a worker that reports as it is sends a body that costs a fix round at the gate.

PASS if the reply runs `spp lint pr 40` before it reports, and fixes the body (adds a `## Laws` section, changes the line to `Verify block corrected: no`) and runs the lint again until it prints `ok`, with the report coming last.

FAIL if the worker would report as the body stands, runs no lint, or fixes the body from its own reading without the lint to confirm it.
