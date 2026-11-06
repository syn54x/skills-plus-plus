# @syn54x/spp

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
