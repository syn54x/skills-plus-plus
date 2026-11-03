# Rebuild as spp 2.0 on an orphan branch

**Supersedes [ADR 0003](./0003-fork-superset-of-mattpocock-skills.md).**

S++ 1.x was a fork of `mattpocock/skills` and carried that base everywhere. The package kept the upstream name, every upstream sync re-applied the fork's hooks to upstream skill files, and the plugin shipped skills the maintainer never used. The spec-driven pipeline had grown incident by incident into prose dense enough that `build-epic` ran past what Claude Code re-attaches after compaction, so its later rules were silently cut. Most recent pipeline bugs were state the model had to infer on every run: readiness, wave bookkeeping, merge order.

We rebuild from scratch, in this repository, on an orphan branch named `next`, and ship it as version 2.0.0 of a plugin renamed `spp`.

## Decisions

- **Same repository, new history.** Issues, the docs domain and the project's name stay in one place. At cutover the current `main` becomes a `v1` branch with a final tag, `next` becomes `main`, and Changesets releases 2.0.0.
- **Out of the fork network.** The repository leaves the `mattpocock/skills` network at cutover. There is no upstream sync, and its process is retired.
- **The model judges; `spp` computes.** Anything that must come out the same every time (readiness, layers, waves, the next action, briefs, marker comments, CI state, merge order, retro numbers) moves into the TypeScript `spp` tool, with no runtime dependencies and tested through recorded GitHub snapshots.
- **Flat skills, a size budget.** Skills live at `skills/<name>/`, and CI fails a `SKILL.md` over 12 KB so no skill is cut after compaction (see `CLAUDE.md`).
- **Own words.** Every skill is rewritten in this project's voice. Concepts from mattpocock/skills, Superpowers, Compound Engineering, ECC, OpenSpec and GSD carry over and are credited in the README; their text does not. Amended by [ADR 0010](./0010-credit-each-skill-and-copy-only-better-text.md), which credits each skill's sources and allows copying text that beats ours.
- **License.** MIT, keeping Matt Pocock's copyright line while any of his text survives, beside the maintainer's.

## Carried decisions

ADRs 0001, 0002, 0004, 0005, 0006 and 0007 are carried, rewritten for 2.0, with their numbers kept. ADR 0003 stays as a superseded record.

## Consequences

- 1.x users reinstall: the rename to `spp` cannot be migrated automatically.
- The v1 pipeline builds this rebuild's own Epic, with its integration branch cut from `next` instead of `main`.
