---
"mattpocock-skills": patch
---

The orchestrator skills write their comments through `sync-progress.sh`. `to-tickets` pins the plan with `plan`, `build-epic` sets the branch and appends **Interface deviations** with `plan`, records each wave with `wave add` and each gated PR with `wave pr`, and hands a ticket back with `hand-back` (`ready-for-human` after the ceiling dispatch, `needs-info` from the parallel safety check). `review-panel` records each round with `wave panel`, and `close-epic` writes its summary, retro and feedback drafts with `upsert`. The epic keeps one wave comment holding every wave and panel round. The four docs pages and `ask-syn54x` describe the new wiring.
