---
"@syn54x/spp": patch
---

`building`: each answer to the dead-worker question now leaves a mark `spp next` reads, so the same `fix` or `merge` stops coming back. Taking a pull request over puts its issue on the running list until you say you are done; handing back a fix pull request closes it with its open findings, so the main gate can run. `spp brief`'s first step now stops BLOCKED when origin already has the ticket's branch or cannot be reached, and the brief tells the worker never to force-push.
