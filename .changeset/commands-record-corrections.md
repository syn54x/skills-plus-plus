---
"@syn54x/spp": patch
---

Four commands now record the corrections they already see as Signals, charged to the skill step that made the corrected artifact: a failed `spp verdict` (`fix-round`), each `spp hand-back` route (`brief-gap`, `missed-edge`, `human-needed`), each `spp plan --add-deviation` (`contract-edited`), and the ready gate's `pin-match` in `spp lint ticket` when a trusted person edited the body (`contract-edited`). `spp feedback pending` lists them. The same Signal is never recorded twice, and nothing is recorded under `CI`, outside an Attended session or with the Self-improvement mode Off. Exit codes, stdout and GitHub writes do not change.

Every Marker comment write that creates the comment or hands it to another skill step now counts one run in a runs log beside the Signal log, the denominator for signals per run.

`spp signal` under `CI` in a checkout with no GitHub origin now prints `not recorded: CI` and exits 0 instead of failing, and a Signal that cannot be written is reported rather than thrown, so `spp findings merge` keeps its exit code.
