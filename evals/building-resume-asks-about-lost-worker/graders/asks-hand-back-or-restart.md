---
type: llm
focus: last_message
---

The session was told to use `building` for Epic 50 of `acme/app` after an earlier build session died with its workers. On the first `spp next` of a run, `building` passes `--resume`, which returns a `hand-back` for #52 whose reason says `worker lost`. That action is a question for the person, never a hand-back on its own: hand #52 back with `needs-info`, or run `spp unclaim 52` and start a worker on it again. The dead worker pushed `sdd/52-import-csv`, so the question names that branch.

PASS if the reply runs `spp next 50` with `--resume` as its first `spp next`, and asks the person to choose between handing #52 back and starting a worker on it again (with `spp unclaim 52` before the new worker), naming the pushed `sdd/52-import-csv` branch, before it runs `spp hand-back 52`, `spp unclaim 52` or `spp dispatch 52`.

FAIL if the reply runs its first `spp next` without `--resume`, only waits on #52, runs `spp hand-back 52` or `spp unclaim 52` without asking first, starts a worker for #52 without asking, or asks without offering both choices.
