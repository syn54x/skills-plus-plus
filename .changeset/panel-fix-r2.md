---
"@syn54x/spp": patch
---

`spp brief` brings a pushed `sdd/<N>-<slug>` branch onto the base before a worker continues it (a rebase that conflicts is aborted and stops the worker as BLOCKED; a closed ticket's own branch, already merged, is never taken), and an origin it cannot ask stops the worker instead of reading as "no pushed branch". `spp wave plan --running` reports each running ticket as held with the reason `running, not claimed yet`, and `spp next` and `spp wave plan` share one parser and one error message for the flag. `building` passes each running ticket in the form the `dispatch` action named it, resumes a worker by the agent id its Agent call returned, and sends a fresh worker for a pull request whose worker died with an earlier session straight to its fix round, so a closed Sub-issue no longer stops it. A restarted lost worker continues the branch it pushed.
