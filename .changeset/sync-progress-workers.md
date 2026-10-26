---
"mattpocock-skills": patch
---

`implement-issue` and `review-pr` write the progress comment through `sync-progress.sh` (`claim`, `progress`, `hand-back`), and every stop without a PR is a hand-back with a route and a reason instead of a label pair, an unclaim and a comment. A cloud PASS in `review-pr` now sets no label (the reviewed open PR and the status `verify-passed` are the signal), and its unreachable "cloud, on an epic slice" branch is gone. The verify-gate hook's stop text and the `sdd-worker` rules say hand-back.
