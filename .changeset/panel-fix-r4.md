---
"@syn54x/spp": patch
---

A resumed build no longer starts a fresh worker on a branch another worker left. When a fix round, a rebase or a settled design needs a worker that died with an earlier session, `building` asks you whether to hand the issue back or take the pull request over. `spp brief`'s first step again only cuts `sdd/<N>-<slug>` from the base and confirms it, and a restarted lost worker starts on that fresh branch, so a branch the lost worker pushed is yours to delete or the issue goes back. `spp next --running` now holds a running ticket in any state, landed included: neither it nor its fix pull requests are routed again while its worker works, and `main-gate` waits for it. `spp wave plan --running` holds each one until it lands, with the reason `running, its worker has not reported back`. `building` keeps each worker's agent id for the rest of the session and puts an issue back on the running list when it resumes its worker.
