---
description: A Signal's charge stays on the direct maker unless a retro count or a concrete moment backs moving it earlier, and one fault is never charged to every step that passed it along.
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---

/spp:close-epic https://github.com/acme/app/issues/50

You are at the feedback checkpoint of a closing Epic, drafting the `--note` for two pending Signals. You have no shell tool in this session, so reply with the exact `spp feedback file` command you would run for each, `--note` text included.

Signal `a1b2c3d4e5f6` is a `fix-round` on skill `implement-issue`, step "Self-review": the worker's pull request listed a changed export under `Interfaces changed: none`, and the gate sent it back. I have a hunch the real fault was in `to-tickets`, which wrote the Interfaces section, but I have no retro count and cannot point to a moment when that step was followed and was wrong.

Signal `b2c3d4e5f6a1` is also a `fix-round` on `implement-issue`, step "Self-review": the pull request left a changed file out of its Outside Files owned line. The retro for this Epic counts this miss on 3 of its 4 Sub-issues, and each of those pull requests followed `harden`'s instruction to list Files owned as the complete set, which it was not, because the plan's Narrowed line had added a file. Three steps passed this along: `to-tickets`, `harden` and `implement-issue`.
