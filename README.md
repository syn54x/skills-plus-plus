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

## Skills

Not sure where to start? Type `/ask-spp` and describe what you are doing; it names the path and the command to type next. The [five paths](https://skills.x54.sh/paths/) lay out every route in order.

### User-invoked

Only you start these, by typing `/<name>`.

| Flow | Skill | What it does |
| --- | --- | --- |
| Plan | [grill](./skills/grill/SKILL.md) | Questions a plan until every choice is settled, recording terms and decisions as they land |
| Plan | [auto-grill](./skills/auto-grill/SKILL.md) | The same interview, with every question the code, ADRs or docs already answer settled for you, cited |
| Plan | [wayfinder](./skills/wayfinder/SKILL.md) | Charts an effort too large for one sitting as a map of decisions, settling one per session |
| Plan | [to-spec](./skills/to-spec/SKILL.md) | Writes the plan the conversation settled as an Epic issue |
| Plan | [to-tickets](./skills/to-tickets/SKILL.md) | Cuts an Epic into Sub-issues with blocking edges and pins the plan |
| Plan | [triage](./skills/triage/SKILL.md) | Moves a filed bug or enhancement to a triage role, hardened and sized when it is ready to build |
| Build | [build](./skills/build/SKILL.md) | Builds an Epic or a hardened One-off into pull requests, with parallel workers behind a review gate |
| Review | [review-panel](./skills/review-panel/SKILL.md) | Reads a pull request to main with several reviewer Personas and ends in MERGE, FIX FIRST or HUMAN DECISION |
| Review | [improve-architecture](./skills/improve-architecture/SKILL.md) | Finds deepening opportunities in the repo or a pull request and files the ones you accept |
| Ship | [prepare-release-notes](./skills/prepare-release-notes/SKILL.md) | Drafts release highlights since the latest tag and prints the release command |
| Ship | [close-epic](./skills/close-epic/SKILL.md) | Finishes a merged Epic with its summary, retro and learnings |
| Ship | [retro](./skills/retro/SKILL.md) | Reviews a session and suggests fixes to the agent's setup, ranked by severity |
| Write and talk | [eli5](./skills/eli5/SKILL.md) | Explains anything simply, in eli5, adhd or wait-what mode |
| Meta | [setup-spp](./skills/setup-spp/SKILL.md) | Prepares a repo for spp: labels, the Routing block, domain docs pointers and the ponytail offer |
| Meta | [ask-spp](./skills/ask-spp/SKILL.md) | Names the path and skill that fit what you are doing |

### Model-invoked

You can type these too, but the agent starts them when a task fits, and other skills call them.

| Flow | Skill | What it does |
| --- | --- | --- |
| Plan | [discuss](./skills/discuss/SKILL.md) | Experimental: talks a vague idea over before it is a plan, and settles nothing |
| Plan | [grilling](./skills/grilling/SKILL.md) | The round-based interview that grill and auto-grill run |
| Plan | [domain-modeling](./skills/domain-modeling/SKILL.md) | Keeps the glossary and ADRs accurate while a design is argued over |
| Plan | [codebase-design](./skills/codebase-design/SKILL.md) | The deep-module vocabulary and the Depth check |
| Plan | [research](./skills/research/SKILL.md) | Sends a background agent for a cited answer from primary sources |
| Plan | [prototype](./skills/prototype/SKILL.md) | Answers one design question with throwaway code on its own branch |
| Plan | [harden](./skills/harden/SKILL.md) | Writes the Ticket contract into one issue and gates it with `spp lint ticket` |
| Build | [implement-issue](./skills/implement-issue/SKILL.md) | The worker's procedure for one hardened issue, from the claim to a verified pull request |
| Build | [tdd](./skills/tdd/SKILL.md) | Grows code test-first in thin vertical slices |
| Build | [diagnosing-bugs](./skills/diagnosing-bugs/SKILL.md) | Builds a command that goes red on the bug before forming any theory |
| Review | [review](./skills/review/SKILL.md) | Gates a pull request with a fresh reviewer and separate spec and quality verdicts |
| Ship | [pr](./skills/pr/SKILL.md) | Writes the pull request body |
| Write and talk | [writing-for-humans](./skills/writing-for-humans/SKILL.md) | The prose rules for anything a person reads |
| Write and talk | [writing-for-agents](./skills/writing-for-agents/SKILL.md) | How to write a document an agent reads and acts on |
| Meta | [feedback](./skills/feedback/SKILL.md) | Records a wish or complaint about spp or one of its skills as a Signal |

## Docs

The docs site is at [skills.x54.sh](https://skills.x54.sh). How the repository itself works is in [CLAUDE.md](./CLAUDE.md), the terms in [GLOSSARY.md](./GLOSSARY.md), and the decisions in [.agents/adr/](./.agents/adr/).

## Credits

spp carries concepts from these projects. Each skill that drew on one lists its sources in its `SKILL.md` frontmatter, and a `CREDITS.md` beside it (for example [`skills/grilling/CREDITS.md`](./skills/grilling/CREDITS.md)) says which part came from where, as [ADR 0010](./.agents/adr/0010-credit-each-skill-and-copy-only-better-text.md) sets out. Across the project:

- [mattpocock/skills](https://github.com/mattpocock/skills): the skill set this project began as a fork of, including grilling, to-spec and to-tickets, triage, TDD, diagnosing bugs, domain modelling and the deep-module vocabulary.
- [Superpowers](https://github.com/obra/superpowers): skills as disciplined workflows, subagent-driven development, and a fresh reviewer for each task.
- [Compound Engineering](https://github.com/EveryInc/compound-engineering-plugin): turning each piece of work's lessons into durable learnings, and parallel reviewer personas.
- [ECC](https://github.com/affaan-m/ECC): hooks that enforce a gate instead of trusting the model to remember it.
- [OpenSpec](https://github.com/Fission-AI/OpenSpec): the spec as the source of truth, with changes recorded as deltas against it.
- [GSD](https://github.com/gsd-build/get-shit-done): keeping each worker's context small and fresh, and state that survives an interrupted session.
- [gitleaks](https://github.com/gitleaks/gitleaks): the secret-detection rules behind the outbound check on Skill feedback, translated from its rule set.

## License

MIT. See [LICENSE](./LICENSE).
