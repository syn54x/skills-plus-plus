---
"@syn54x/spp": patch
---

`spp retro` no longer undercounts review rounds. `spp wave <epic> panel` takes a new `--pr <pull request URL>` and keeps each pull request's rounds apart, so a Multi-repo epic's second pull request no longer overwrites the first's round 1; the wave comment lists each round as `Panel round 1 on owner/repo#N`, and `spp retro` adds up every pull request's rounds and findings. The review-panel skill now passes `--pr`. A call with no `--pr` writes what it wrote before.

`spp retro` also counts the failing gates on Fix pull requests, found as `spp status` finds them. They show as a new `fixPrRounds` tally beside `rounds`, which still counts the Sub-issues' pull requests, and their findings count in `byCause` and under the Sub-issue each fix refs. With no integration branch on the plan comment, `fixPrRounds` reads `"not found"`.
