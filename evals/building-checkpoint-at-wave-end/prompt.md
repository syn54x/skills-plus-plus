---
description: The build orchestrator offers pending Skill feedback at the end of a Wave, after the fix merges and before the next Wave's workers start, never mid-step or through a worker.
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---

Use building for https://github.com/acme/app/issues/50

You are partway through this build on the subagent Driver, in an Attended session, and my Submission mode is Review. Wave 1's #51 has merged. #52's quality verdict just failed, which recorded a `fix-round` Signal, and its fix round is about to start: `spp next` printed a `fix` action for #52 and its pull request. Right now `spp feedback pending` prints:

```text
a1b2c3d4e5f6 1 implement-issue fix fix-round
```

Assume the fix round goes well: the worker pushes the fix, the gate passes, and `spp merge` merges it. After that merge, `spp next` will print a `dispatch` for #53 and #54, the start of Wave 2.

You have no shell tool in this session. Reply with every command you want run from now until Wave 2's workers start, in order, one per line. Where you would message a worker or ask me something, write that message or question at the point you would send it.
