# The canonical install block

One install story, one wording. `README.md`, `.changeset/*`, and every page under `docs/` must say **this** and nothing else. Change it here first, then propagate.

This repo is a fork of `mattpocock/skills`. Upstream's plugin, `mattpocock-skills`, is listed in Claude Code's official marketplace; this fork's plugin, `skills-plus-plus`, is not. It installs from the fork's own marketplace (`syn54x`, defined in `.claude-plugin/marketplace.json`), so there is one marketplace to add first. Why the fork exists and how it tracks upstream lives in [adr/0003-fork-superset-of-mattpocock-skills.md](./adr/0003-fork-superset-of-mattpocock-skills.md).

## Claude Code: the plugin

<canonical-block name="claude-code">

```bash
claude plugins marketplace add syn54x/skills-plus-plus
claude plugins install skills-plus-plus@syn54x
```

Or, from inside a session:

```
/plugin marketplace add syn54x/skills-plus-plus
/plugin install skills-plus-plus@syn54x
```

</canonical-block>

## Cursor and Codex: the plugin

The same repo is also a Cursor plugin (`.cursor-plugin/`) and a Codex plugin (`.codex-plugin/`, with its marketplace at `.agents/plugins/marketplace.json`), both named `skills-plus-plus` in the `syn54x` marketplace. Cursor ships the promoted set and the agents; its hooks are unverified. Codex ships every bucket and is unverified. See [adr/0002-ship-as-a-claude-code-plugin.md](./adr/0002-ship-as-a-claude-code-plugin.md). Until both are verified, the README documents only Claude Code and skills.sh.

## Codex, and other agents: skills.sh

Everywhere else, [skills.sh](https://skills.sh/syn54x/skills-plus-plus) copies editable skill files into the project. Use the whole-set form on `README.md`:

<canonical-block name="skills-sh-whole-set">

```bash
npx skills@latest add syn54x/skills-plus-plus
```

Pick the skills you want, and which coding agents to install them on. **The installer lets you choose which skills to take: make sure `setup-syn54x-skills` is one of them.**

</canonical-block>

…and the single-skill form wherever one skill is named on its own. `docs/` pages are not a consumer of this block; see [writing-docs.md](./writing-docs.md).

<canonical-block name="skills-sh-one-skill">

```bash
npx skills@latest add syn54x/skills-plus-plus --skill=<name>
```

```bash
npx skills@latest update <name>
```

</canonical-block>

`skills@latest` is the pinned spelling in all three.

## The two routes are exclusive

The plugin is a managed, read-only bundle you subscribe to. skills.sh writes files you own and edit. Installing both leaves the user with every skill twice: always say "pick one".

## Never alongside upstream

This set contains every skill `mattpocock-skills` ships, some renamed (`setup-syn54x-skills`, `ask-syn54x`) and some extended (`to-tickets`, `implement`). Installing both gives duplicate skill names with different behaviour. Tell users to remove upstream first.
