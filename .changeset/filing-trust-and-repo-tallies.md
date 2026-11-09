---
"@syn54x/spp": patch
---

`spp feedback file` now adds your tally only to a grouped issue that you or an owner, member or collaborator of `syn54x/skills-plus-plus` opened, so a stranger's issue carrying the fingerprint can no longer collect it; the Review preview names the issue's author. You keep one tally comment per repo you file from, keyed by a hash of the repo under a secret kept in your spp config, so the key names no repo and filing from a second repo no longer overwrites the first one's counts. `spp feedback file` now refuses outside an Attended session and in a worker, and the checkpoint recognises a worker the same way `spp` does everywhere else.
