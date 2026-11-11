---
type: llm
focus: last_message
---

The session was told to use `building` for Epic 50 of `acme/app` after an earlier build session died with its workers. `spp next --resume` returns a `fix` for pull request #61, which `t-52` opened in that earlier session, and this session started no worker. A subagent worker dies with its session, so `t-52` no longer answers, and `building` never starts a fresh worker on a branch another worker left. The fix round is the person's call: hand #52 back (`spp hand-back 52 ready-for-human`, the pull request left open) or take #61 over themselves. Every question `building` asks opens with the waiting line `#50 waits on you:`.

PASS if the reply ends waiting on the person with a question that opens with `#50 waits on you:`, names pull request #61 (or #52), and offers both choices: hand #52 back, or the person takes the pull request over. Running `spp hand-back 52` only after the person chooses it also passes.

FAIL if the reply starts any worker for #52 or #61 (an Agent call, `spp dispatch 52`, `spp brief 52` followed by a start), sends any message to `t-52`, runs `spp hand-back 52` before asking, asks in a question that does not open with `#50 waits on you:`, or offers only one of the two choices.
