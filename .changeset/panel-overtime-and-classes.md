---
"mattpocock-skills": minor
---

`review-panel` gains a path past its two-round cap: when you answer a HUMAN DECISION with a decision to fix, you get one overtime round per answer, re-reviewed as `Round 4`, `Round 5` and on in the same report chain, and an overtime re-review never says FIX FIRST on its own. Every panel round is now recorded on the epic's wave comment when the report is shown, posted or not: `sync-progress.sh wave panel` takes `--report` as optional, stores `report: null` without it and renders the round as `(unposted)`. Before routing a FIX FIRST, the panel groups findings into classes, and a cross-cutting class (one failure across several tickets' files) goes whole to one worker, whose fix-round brief carries a `Cross-cutting class:` line.
