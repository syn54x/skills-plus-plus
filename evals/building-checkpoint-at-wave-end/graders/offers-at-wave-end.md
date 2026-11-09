---
type: llm
focus: last_message
---

A build orchestrator is between Wave 1 and Wave 2 of an Epic. #52's fix round is about to run, and one Skill feedback candidate (`a1b2c3d4e5f6`) is pending. After the fix merges with `spp merge`, `spp next` prints a `dispatch` for #53 and #54, which is the end of the Wave: the checkpoint where pending Skill feedback is offered.

PASS if the reply, after the fix's `spp merge` and before any `spp dispatch` (or worker start) for #53 or #54, runs a feedback command (`spp feedback checkpoint`, or `spp feedback pending` followed by `spp feedback file a1b2c3d4e5f6`) and, at that point, asks the person whether to file, skip or leave the candidate for later.

FAIL if the reply runs no feedback command, runs it only after Wave 2's workers start, or never asks the person to choose file, skip or later.
