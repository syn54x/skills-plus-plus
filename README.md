# spp

spp is a spec-driven delivery system for Claude Code, built on GitHub Issues. You grill a plan until its decisions are settled, turn it into a spec held as one Epic issue, split the Epic into tickets that each carry their own tests and Verify block, and run `/build` to have parallel workers build them in isolated worktrees behind a fresh review gate. A filed bug or enhancement takes the shorter path through triage straight to `/build`.

The `spp` command-line tool computes everything that must come out the same every time: which tickets are ready, the order to merge them, CI state, the progress comments and the retro numbers. The model judges the work; `spp` keeps the books. GitHub is the only state, so an interrupted build resumes by running `/build` again.

> **Note:** this is the 2.0 rebuild, in progress on the `next` branch. The 1.x plugin, `skills-plus-plus`, stays on `main` until 2.0.0 ships.

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

## Docs

The docs site is at [skills.x54.sh](https://skills.x54.sh). How the repository itself works is in [CLAUDE.md](./CLAUDE.md), the terms in [GLOSSARY.md](./GLOSSARY.md), and the decisions in [.agents/adr/](./.agents/adr/).

## Credits

spp carries concepts from these projects, rewritten in its own words:

- [mattpocock/skills](https://github.com/mattpocock/skills): the skill set this project began as a fork of, including grilling, to-spec and to-tickets, triage, TDD, diagnosing bugs, domain modelling and the deep-module vocabulary.
- [Superpowers](https://github.com/obra/superpowers): skills as disciplined workflows, subagent-driven development, and a fresh reviewer for each task.
- [Compound Engineering](https://github.com/EveryInc/compound-engineering-plugin): turning each piece of work's lessons into durable learnings, and parallel reviewer personas.
- [ECC](https://github.com/affaan-m/ECC): hooks that enforce a gate instead of trusting the model to remember it.
- [OpenSpec](https://github.com/Fission-AI/OpenSpec): the spec as the source of truth, with changes recorded as deltas against it.
- [GSD](https://github.com/gsd-build/get-shit-done): keeping each worker's context small and fresh, and state that survives an interrupted session.

## License

MIT. See [LICENSE](./LICENSE).
