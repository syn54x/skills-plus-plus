---
"@syn54x/spp": patch
---

A worker resumed for a fix round now plans every finding before its first edit, following `implement-issue`'s new `FIX-ROUND.md`. For each finding it writes down the root cause, every caller and test the change reaches, any overlap with another finding's fix, and the test that guards against a regression. Then it adds a `## Fix plan` section to the pull request. Before this, a worker fixed each finding at the line the finding named, and the fix often broke nearby code, which the next review then reported as a new finding. `build` and `review-panel` now brief the worker to plan the fix first.
