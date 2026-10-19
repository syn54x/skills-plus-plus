---
"mattpocock-skills": minor
---

`review-panel`'s FIX FIRST route now ends each fix round with a re-review of the new head: a per-finding check, `review-pr`'s full-epic Spec and Coherence re-run, and a **Composition pass** over the round's combined fix diff, written as a report marked `Round 2` or `Round 3` and posted only when the user says so. Two fix rounds at most; anything still blocking after the second goes to the user as HUMAN DECISION, and `build-epic` §7 follows the same loop (#32). `close-epic`'s retro now finds ticket PRs by integration-branch base and `Closes #N` (with the wave comment, and closed-by references for the one-ticket case), reads every panel report from PR comments as well as reviews and counts each round, and reports a missing input as not found instead of 0; `scripts/check-sdd-retro.sh` checks the script against stub-`gh` fixtures (#23).
