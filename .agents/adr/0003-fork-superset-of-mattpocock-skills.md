# Fork `mattpocock/skills` and extend it in place

`syn54x/skills` started as a separate pack layered on top of `mattpocock/skills`: `to-tickets-plus` called `/to-tickets`, `setup-syn54x-skills` told the user to run `/setup-matt-pocock-skills` first, and `build-epic` dispatched workers that ran `/implement-issue`. That layering broke in real use. Upstream's entry points are user-invoked (`disable-model-invocation: true`), and per [invocation.md](../invocation.md) a user-invoked skill can never be called by the model or by another skill, so every cross-pack call either stalled or had to be bounced back to the human.

We forked upstream into `syn54x/skills-plus-plus` and moved the SDD pipeline and the generic `syn54x/skills` skills into it. Owning the base skills lets an extension live inside the skill it extends, so no skill ever has to call a user-invoked one.

## How the fork is shaped

- **Extend in place, extract the bulk.** When the fork adds behaviour to an upstream skill, the upstream `SKILL.md` gets a hook of one to three lines and the new content goes in a sibling reference file (for example `to-tickets/SDD.md`). Upstream edits to the `SKILL.md` then merge with at most a small conflict around the hook.
- **Fork-only skills are new directories.** `build-epic`, `implement-issue`, `review-pr`, `review-panel`, `close-epic`, `sync-progress`, the scaffolds, `prepare-release-notes`, `adhd` and `eli5` never conflict with upstream.
- **Renames are limited to Matt-branded skills.** `setup-matt-pocock-skills` became `setup-syn54x-skills` and `ask-matt` became `ask-syn54x`. Every other skill keeps its upstream name so `git merge` can follow upstream edits into it. Git rename detection carries upstream edits into the two renamed directories.
- **Plugin identity is the fork's, the package name is upstream's.** `.claude-plugin/` names the plugin `skills-plus-plus` in the `syn54x` marketplace. `package.json` keeps `name: mattpocock-skills`: it is private and never published, and every upstream changeset is keyed to that name, so renaming it would break `changeset version` on each sync.

## Consequences

- Upstream's `docs/` pages still point at `aihero.dev`; fork-only and renamed pages point at GitHub. [writing-docs.md](../writing-docs.md) says which link goes where.
- Syncing upstream is a routine chore, not a rebase. The steps live in [upstream-sync.md](../upstream-sync.md).
- `syn54x/skills` is archived once the move is complete, with a pointer to this repo.
