# One user-invoked entry per step; everything it drives is model-invoked

A user-invoked skill can be started only by a person (see [invocation.md](../invocation.md)). That is right for a step a person chooses to take, and fatal for a skill that another skill or a worker has to start: in 1.x, workers could not start their implementation skill and reviewers could not start the review skill until those were flipped to model-invoked.

We give each step a person takes exactly one user-invoked entry, and make every skill those entries drive model-invoked.

| Flow | User-invoked entries | Model-invoked skills underneath |
| --- | --- | --- |
| Plan | `grill`, `auto-grill`, `wayfinder`, `to-spec`, `to-tickets`, `triage` | `grilling`, `domain-modeling`, `codebase-design`, `research`, `prototype`, `harden` |
| Build | `build` | `implement-issue`, `tdd`, `diagnosing-bugs` |
| Review | `review` (also model-invoked), `review-panel`, `improve-architecture` | `review` |
| Ship | `prepare-release-notes`, `close-epic`, `retro` | `pr` |
| Write and talk | `eli5` | `writing-for-humans`, `writing-for-agents` |
| Meta | `setup-spp`, `ask-spp` | |

## Why the model-invoked ones are safe to reach unprompted

- `implement-issue` acts only on an issue carrying the ticket contract, and `review` adds its spec verdict only when a ticket is linked.
- `harden` writes the contract into one issue it was handed; `spp lint` gates the result.
- The rest read or write prose and post nothing on their own.

## How `build` reaches the panel

`build` is user-invoked and so is `review-panel`, so `build` cannot call it as a skill. The panel runs as a plugin workflow that `build` starts when the Epic crosses the size thresholds; a person can still type `/review-panel` on any pull request to main.

`scripts/check-invocation.ts` enforces the rule: any `Call the Skill tool with "x"` or agent `skills:` preload naming a user-invoked skill fails CI.
