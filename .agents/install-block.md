# The install block

There is one way to describe installing spp, and it lives here. `README.md`, `docs/index.md` and any changeset that mentions installing copy the blocks below word for word. Change a block here first, then copy it out.

spp is a Claude Code plugin named `spp`, listed in the `syn54x` marketplace that this repository defines in `.claude-plugin/marketplace.json`. Claude Code is the only harness 2.0.0 ships for; other harnesses come later under the portability law in `CLAUDE.md`.

A plugin install updates itself: Claude Code reinstalls when `version` in `.claude-plugin/plugin.json` changes, and the Release workflow moves that field when a version pull request merges. Never promise an instant update.

## Claude Code

<canonical-block name="claude-code">

From a terminal:

```bash
claude plugin marketplace add syn54x/skills-plus-plus
claude plugin install spp@syn54x
```

Or inside a Claude Code session (2.1.275 or later):

```text
/plugin install spp --marketplace syn54x/skills-plus-plus
```

</canonical-block>

## Coming from skills-plus-plus 1.x

The 1.x plugin was named `skills-plus-plus`. The rename means a reinstall, and keeping both installed gives you two sets of skills with clashing names. Remove the old plugin first:

<canonical-block name="from-v1">

```bash
claude plugin uninstall skills-plus-plus@syn54x
```

</canonical-block>

## Where the blocks go

- `README.md` copies `claude-code` and `from-v1`.
- `docs/index.md`, the site's install page, copies both as well. Skill pages link to it and never repeat the commands (see [writing-docs.md](./writing-docs.md)).
