---
"mattpocock-skills": minor
---

`sync-progress` now has one script, `sync-progress.sh`, with a subcommand per operation (`upsert`, `progress`, `plan`, `wave add|pr|panel`, `claim`, `unclaim`, `hand-back`), and owns the shapes of the progress, plan and wave comments (ADR 0007). A caller names the comment and the fields it sets; the script reads the existing comment, keeps every field not passed, renders the lines humans read and stores the state as a base64 JSON trailer on the last line (`<!-- sdd-data: … -->`), so two writers of one comment no longer erase each other's lines. A trailer that is present but does not decode stops the write with an error instead of being overwritten. The wave comment keeps every wave and every panel round; a retried `wave add` or `wave panel` replaces its entry instead of duplicating it, and wave tickets and edges accept `owner/repo#N` or an issue URL for multi-repo epics. `hand-back` replaces the three-step stop: it records status `handed-back` with the route and reason, sets the route label (`needs-info`, `ready-for-human`, and `blocked` without `--blocked-by` also remove `ready-for-agent`; `blocked --blocked-by` adds the native blocked-by edge and keeps it), then clears the `claimed` mark.

Breaking for anyone who used the old pieces:

- The `progress-comment` upsert script is removed; call `sync-progress.sh upsert` instead.
- The GitLab and local-tracker claim adapters are removed. The claim mark is GitHub-only, since the SDD pipeline runs on GitHub Issues alone (see the 2026-10-25 update to ADR 0006).
- The progress status `done` is gone, and `blocked` folds into `handed-back` with a route and a reason.
- A cloud PASS no longer labels the ticket `ready-for-human`; the reviewed open PR and the status `verify-passed` are the signal.

`GLOSSARY.md` gains **Marker comment** and **Hand-back**.
