# spp

spp is a spec-driven delivery system for Claude Code, built on GitHub Issues. You grill a plan until its decisions are settled, turn it into a spec held as one Epic issue, split the Epic into tickets that each carry their own tests and Verify block, and run `/build` to have parallel workers build them in isolated worktrees behind a fresh review gate. The `spp` command-line tool computes everything that must come out the same every time, and GitHub is the only state. The source, the changelog and the issue tracker live at [syn54x/skills-plus-plus](https://github.com/syn54x/skills-plus-plus).

## Install

From a terminal:

```bash
claude plugin marketplace add syn54x/skills-plus-plus
claude plugin install spp@syn54x
```

Or inside a Claude Code session (2.1.275 or later):

```text
/plugin install spp --marketplace syn54x/skills-plus-plus
```

The plugin updates itself whenever a new version is released.

If you have the 1.x plugin installed, remove it first, since the two ship skills with clashing names:

```bash
claude plugin uninstall skills-plus-plus@syn54x
```
