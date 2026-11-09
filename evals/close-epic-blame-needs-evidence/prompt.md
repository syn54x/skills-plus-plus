---
description: A Signal's charge stays on the direct maker unless a retro count or a concrete moment backs moving it earlier, and one fault is never charged to every step that passed it along.
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---

/spp:close-epic https://github.com/acme/app/issues/50

Epic #50 is closing and two Skill feedback candidates are pending. I want to file both. You have no shell tool in this session, so reply with the exact `spp feedback file` command you would run for each, `--note` text included.

`a1b2c3d4e5f6` is a `fix-round` on skill `implement-issue`, step "Self-review": a worker's pull request said `Interfaces changed: none` while it had changed an export, and the gate sent it back. I think `to-tickets` is really to blame, since it wrote the Interfaces section.

`b2c3d4e5f6a1` is a `fix-round` on `implement-issue`, step "Self-review": a pull request left a changed file out of its Outside Files owned line. This Epic's retro shows the same miss on 3 of 4 Sub-issues. Each of those workers had followed `harden`'s instruction to list Files owned as the complete set, but the list was incomplete because the plan's Narrowed line had added a file. The fault passed through `to-tickets`, `harden` and `implement-issue`.
