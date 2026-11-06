# @syn54x/spp

## 2.3.0

### Minor Changes

- 3c14c8d: `/to-tickets` now checks the set for values worked out twice. When one Sub-issue works a value out from another module's output (a client inferring each row's state from a summary the server returns), it asks whether the module that holds the inputs should produce the value itself. If so, the producer gains a Produces line or a Sub-issue of its own before anything is released, and the consumer reads the value. A derivation you meant to keep is yours to accept.

### Patch Changes

- 8856ea4: `spp dispatch <issue> --driver subagent` now refuses a folder that is not inside a git repository, before it reads GitHub. The `spp:worker` agent cuts its worktree from the session's folder, so every worker started from such a folder failed with `Cannot create agent worktree: not in a git repository`. The refusal says to run `/build` from inside the checkout of the repository that owns the issue, or to choose another Driver. The `bg` and `desktop` Drivers are unchanged.
- f197712: The stop hook, `spp verify --check`, now ends its refusal on a `Stop` event with one more sentence: if this is a worker's worktree and you are not that worker, cd back to your own checkout and stop again. The hook judges the tree the session stands in and cannot tell whose work is there. An orchestrator whose shell was left inside a worker's worktree was therefore refused at the end of every turn until the worker committed, and one run polled through 18 fix rounds that way. `build` on Claude Code now tells the orchestrator to read a worker's worktree with `git -C <path>` and to stay out of it. A `SubagentStop` refusal and a run by hand print what they printed before, and which stops are refused has not changed.

## 2.2.0

### Minor Changes

- 5a6a9ac: New skill `discuss`: type `/discuss <idea>`, or say you want to brainstorm or kick an idea around, and the agent talks a vague idea over with you before it is a plan, then names where it should go next. It is experimental, so it may change or be removed.
- 1ca3abf: `/epic-board` with no argument now picks the Epic itself: the parent of an `sdd/<N>-*` branch, the Epic whose plan records a `feat/<slug>` branch, or the one Epic in flight in the repo. With several in flight it lists them; with none it says so.

## 2.1.0

### Minor Changes

- b402fe2: In the Claude desktop app, `/build` now asks which Driver to use when you approve an Epic's first Wave, since desktop linked sessions start each later Wave only on a message from you. `spp plan <epic> --driver desktop|bg|subagent` records the choice and `spp next` reports it on `dispatch`, so a resumed run reuses it.

### Patch Changes

- 5cc096f: Credit each skill's sources: a skill that drew on an incumbent now lists them under `metadata.credits` in its frontmatter, with a `CREDITS.md` beside it saying which part came from where.

## 2.0.1

### Patch Changes

- f1fe2bd: Shorten every model-invoked skill's description to one clause and its triggers, so Claude reaches for skills like `pr` and `tdd` on its own again.

## 2.0.0

### Major Changes

- b3d5eb3: spp 2.0.0: the rebuild of S++ as the `spp` plugin and the `@syn54x/spp` command-line tool, on a flat skill layout, with GitHub Issues as the only state and a Verify pin that guards every run of an issue's Verify block.
