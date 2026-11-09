---
"@syn54x/spp": patch
---

`spp status`, `spp next`, `spp retro`, the epic board and `spp merge` now count a closing reference only when a line of the pull request body opens with a closing keyword (spaces or tabs may come before it), such as `Closes #2` or `Fixes: acme/app#2`. A sentence that says "this also fixes #1's edge case" no longer links the pull request to #1, and a reference followed by an apostrophe is never a closing reference, even at the start of a line. Before this, a Fix pull request that mentioned another ticket in prose could be listed as that ticket's pull request with its verdict, and `spp merge` could refuse it with `gate not passed` for the wrong ticket.
