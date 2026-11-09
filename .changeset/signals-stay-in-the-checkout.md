---
"@syn54x/spp": patch
---

Signals and runs now go to the Signal log of the checkout you run spp in, never to another repo's. A correction on an issue or pull request in another repo is recorded only when that repo's Self-improvement mode is not Off, so a repo set to Off collects nothing from anywhere. Such a Signal keeps the lower of the two modes (a new optional `mode` field, also on `spp feedback pending --json`), and `spp feedback file` files its candidate at that mode or lower, with or without `--epic`. The log itself now drops a Signal it already holds (the same fingerprint and evidence), whatever was decided on it, so `spp signal`, `spp findings merge` and every correction get the check, and a filed candidate no longer comes back with a repeat of the same evidence. `spp signal --by` is parsed like every other `--by`, so `--by "Harden 3"` is a usage error instead of a Signal charged to `Harden`.
