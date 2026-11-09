---
"@syn54x/spp": patch
---

A Signal about another repo's issue now keeps that repo's name (a new optional `about` field, also on `spp feedback pending --json`), and `spp feedback file` treats those repos as it treats an Epic's: Submission mode Auto falls back to Review when one is private, and the outbound check guards their names. A run is recorded once: `spp findings merge --fix-diff` names its run for the patch's folder and file (`spp-panel-<PR>/fix-<round>.patch`), so merging the same round again adds none. When a skill step has no recorded runs, the grouped issue's title and body say its runs are not recorded instead of "over 0 recorded runs", and the `feedback` skill charges a wish to the skill alone, so it is counted over that skill's runs. `spp feedback checkpoint` checks for a worker before anything else, so a worker's session start asks gh nothing. The spp config file, which holds the tally secret, is left at mode 0600 on every write.
