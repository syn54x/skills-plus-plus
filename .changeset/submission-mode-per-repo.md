---
"@syn54x/spp": patch
---

The Submission mode is now kept per person for each repo. `spp feedback submission [Auto|Review]` reads and sets the mode for the checkout's repo, so choosing Review for a private repo leaves Auto in place for your public ones, and `spp feedback file` reads the mode for the repo it files from. A repo you never set reads as Review.
