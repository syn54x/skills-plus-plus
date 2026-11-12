---
description: At the first Wave of an Epic, building puts the approval question first in its final message and asks nothing about how workers run, even when the plan comment still records a desktop driver.
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---

Use building for #50 in acme/app.

You have no shell in this session, so here is what the commands print. This session runs in the desktop app, inside the checkout of `acme/app`.

- `spp kind 50` prints `epic: #50 has Sub-issues`.
- `spp next 50 --json` prints `{"actions":[{"kind":"dispatch","tickets":["51","52"],"reason":"2 ready ticket(s) can run together"}]}`.
- The Epic's wave comment lists no Wave yet. Its plan comment, written by an older spp, still has a line `**Driver:** desktop`.
- `spp wave plan 50` prints a Wave of #51 (size:S, owns `src/export.ts`) and #52 (size:M, owns `src/import.ts`), and holds back #53 because it is blocked by #51.

Take it from there.
