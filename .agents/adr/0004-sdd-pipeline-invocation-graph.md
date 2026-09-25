# SDD pipeline: one user-invoked entry per step, everything underneath model-invoked

The SDD pipeline came from `syn54x/skills`, where every skill was user-invoked. That was harmless for skills a human types and fatal for skills another skill or agent has to start: `build-epic`'s workers could not start `/implement-issue`, `sdd-reviewer` could not start `/review-pr`, and `build-epic` could not reach `/review-panel` or `/close-epic`. Per [invocation.md](../invocation.md), a user-invoked skill is reachable only by the human.

We give each step of the pipeline exactly one user-invoked entry point, and make every skill those entry points drive model-invoked:

| Skill | Invocation | Reached by |
| --- | --- | --- |
| `setup-syn54x-skills` | user | the human, once per repo |
| `to-spec`, `to-tickets` | user | the human (the SDD pass lives inside `to-tickets`, see ADR 0003) |
| `build-epic` | user | the human; the orchestrator |
| `implement` | user | the human; hands an SDD sub-issue to `implement-issue` |
| `implement-issue` | model | `build-epic` workers, the `sdd-worker` agent's preload, `implement`, the cloud workflow |
| `review-pr` | model | `build-epic`, the `sdd-reviewer` agent, `review-panel`, the cloud workflow |
| `review-panel` | model | `build-epic`, or the human asking for a panel on a PR to `main` |
| `close-epic` | model | `build-epic` after the human merges, or the human in any later session |
| `sync-progress` | model | every SDD skill that writes a marker comment |

## Why each flip is safe

- **`implement-issue`, `review-pr`**: their triggers are narrow (an issue with Files owned and Verify; a PR from an `sdd/*` branch), and both refuse to act on anything else.
- **`review-panel`**: it never posts without an explicit yes, so an accidental trigger costs tokens, not a comment.
- **`close-epic`**: it refuses while any sub-issue or the PR to `main` is open, and it files nothing upstream without per-issue consent from an interactive user.
- **`sync-progress`**: a reference skill; it only writes when another skill asks it to.

`scripts/check-invocation.py` enforces the rule in CI: a `Call the Skill tool with "x"` line or an agent's `skills:` preload that names a user-invoked skill fails the build.
