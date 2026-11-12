---
"@syn54x/spp": minor
---

A build resumed after its session died now asks about the work its lost workers left behind. `spp next <epic> --resume` returns each Sub-issue that is claimed, with no open or merged pull request and no assignee, as a `hand-back` saying `worker lost`, and `building` passes `--resume` on the first `spp next` of each run, so you choose whether to hand the issue back or start a worker on it again. `spp next`, `spp wait`, `spp wave plan` and the Epic board no longer read the `claude agents` session list: `spp wait` no longer prints `t-<N> done` lines, and the board lists only its own session's subagent workers, so its `attach` button is gone.
