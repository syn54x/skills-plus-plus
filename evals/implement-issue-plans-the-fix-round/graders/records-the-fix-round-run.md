---
type: llm
focus: trace
---

A fix round must tell spp it is one, so the run counter charges the round to its own step. The skill says to write the round's first progress comment with `--by "implement-issue fix round"`.

PASS if the trace shows FIX-ROUND.md or CLAUDE-CODE.md being read, and the reply or the plan mentions that the round's first `spp progress` write carries `--by "implement-issue fix round"`.

FAIL if the reply never mentions `--by` for the progress write, or names a different step.
