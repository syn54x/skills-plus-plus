---
description: When a pull request whose worker this session started fails its gate, building sends the findings to that worker by the agent id its Agent call returned, never to its t-<N> name and never to a new worker.
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---

Use building for #50 in acme/app.

You are partway through this build. You have no shell in this session, so here is what has happened. This session runs inside the checkout of `acme/app`, whose integration branch for #50 is `feat/csv`.

- `spp kind 50` printed `epic: #50 has Sub-issues`. I approved Wave 1, and you started one worker for #52 with an Agent call whose description was `t-52 implement #52`. That call returned the agent id `a3f9c27e51d04b68`.
- The worker reported `{"ticket": 52, "pr": "https://github.com/acme/app/pull/61", "verifySha": "4e1d2c9", "status": "DONE", "notes": "..."}`, and you took #52 off the running list.
- You gated #61. Its quality verdict failed with one Important finding: "src/import.ts:40 drops the header row when the file has a byte order mark".
- `spp next 50 --json` now prints `{"actions":[{"kind":"fix","tickets":["52"],"pr":"https://github.com/acme/app/pull/61","reason":"#61 failed its gate; one fix round by the same worker"}]}`.

Take it from there. Reply with every step you would take, in order, one per line. Where you would send a worker a message, name the tool, the exact recipient and the message in full.
