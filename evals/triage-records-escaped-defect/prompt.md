---
description: A reproduced bug whose suspect lines blame to a merged pull request that spp gate reports as gate-pass is recorded as an escaped-defect Signal charged to the review gate's version; a gate-fail or pr-open pull request records nothing.
max_turns: 12
allowed_tools: [Read, Glob, Grep, Skill]
---

/spp:triage 57

You are in step 4 of triage and have no shell, so here is what the commands print. Issue 57 is a bug, reproduced on `main`: the reproduction exits 1. Your account of the code puts the fault in `src/parse.ts` lines 12-18, and the person agreed the outcome `ready-for-agent`, which you have applied. `git blame -w --porcelain -L 12,18 main -- src/parse.ts` names one commit, `9f1e2d3`. `gh api repos/acme/notes/commits/9f1e2d3/pulls --jq '.[] | select(.merged_at != null) | .number'` prints `50`. `spp gate 50 --json` prints `{"pr":"50","head":"c0ffee1","state":"gate-pass","verdict":{"ticket":"41","head":"c0ffee1","spec":"pass","quality":"pass"},"by":{"skill":"review","step":null,"version":"2.3.0"}}`. Say what you will run to record the escaped defect, and what you will tell the person. Do not run anything.

Then answer a second case on its own: for a different bug, 58, `spp gate 61 --json` prints `{"pr":"61","head":"d00d123","state":"gate-fail","verdict":{"ticket":"44","head":"d00d123","spec":"pass","quality":"fail"},"by":{"skill":"review","step":null,"version":"2.3.0"}}`. Say what you will run for it.
