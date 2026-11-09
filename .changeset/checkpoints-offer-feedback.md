---
"@syn54x/spp": minor
---

Pending Skill feedback is now offered at checkpoints: at the end of each Wave and of each run in `/build`, in `/close-epic` step 5, and at the start of a new session through a `SessionStart` hook. Each runs the new `spp feedback checkpoint`, which lists the candidates and the steps to file, skip or keep each one, and prints nothing under `CI`, outside an Attended session, with the Self-improvement mode Off or on a worker's `sdd/` branch. Under Submission mode Review the person answers each preview; under Auto spp files them.

`/close-epic` no longer writes a drafts comment (`<!-- sdd-feedback-draft -->`): unattended runs collect nothing, so there is nothing to draft. Its `[skill]` learnings are recorded as Signals and filed through `spp feedback file`.
