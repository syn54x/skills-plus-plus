---
"@syn54x/spp": patch
---

`spp findings merge` takes a new `--fix-diff <file>` flag. From round 2 the review panel passes it the patch of the fixes made since the previous round. A merged finding that sits on a line the patch added or changed, and that no `recheck-` finding was merged into, is recorded as a `fix-regression` Signal against the fix round step of `implement-issue`, and stderr says whether each one was recorded. Without the flag, and in stdout and `--json` with it, the merge behaves as before.
