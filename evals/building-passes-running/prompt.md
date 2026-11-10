---
description: After a Wave's workers start, building passes every issue whose worker it started and that has not reported back to the next spp next as --running, so an issue not yet claimed is not dispatched twice.
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---

Use building for #50 in acme/app.

You are partway through this build. You have no shell in this session, so here is what has happened. This session runs inside the checkout of `acme/app`.

- `spp kind 50` printed `epic: #50 has Sub-issues`, and the first `spp next` of this run, with `--resume`, printed `{"actions":[{"kind":"dispatch","tickets":["51","acme/lib#7"],"reason":"2 ready ticket(s) can run together"}]}`.
- I approved Wave 1. You started both workers a moment ago, `t-51` for #51 and `t-7` for `acme/lib#7`, and recorded the Wave. Neither worker has reported back.
- `spp status 50` now shows #51 claimed by `t-51`; `acme/lib#7` is still ready, since its worker has not claimed it yet.

Take it from there. Reply with the next command you would run, exactly as you would run it, and why.
