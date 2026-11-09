---
"@syn54x/spp": patch
---

`spp feedback file` now adds your tally only to a grouped issue that you or an owner, member or collaborator of `syn54x/skills-plus-plus` opened, so a stranger's issue carrying the fingerprint can no longer collect it; the Review preview names the issue's author. You keep one tally comment per repo you file from, keyed by a hash of the repo, so filing from a second repo no longer overwrites the first one's counts. `spp feedback file` and `spp feedback skip` now refuse outside an Attended session and in a worker, and the checkpoint recognises a worker the same way `spp` does everywhere else.
