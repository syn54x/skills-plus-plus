# One user-invoked entry per step; everything it drives is model-invoked

A user-invoked skill can be started only by a person (see [invocation.md](../invocation.md)). That is right for a step a person chooses to take, and fatal for a skill that another skill or a worker has to start: in 1.x, workers could not start their implementation skill and reviewers could not start the review skill until those were flipped to model-invoked.

We give each step a person takes exactly one user-invoked entry, and make every skill those entries drive model-invoked.

| Flow | User-invoked entries | Model-invoked skills underneath |
| --- | --- | --- |
| Plan | `grill`, `auto-grill`, `discuss` (also model-invoked), `wayfinder`, `to-spec`, `to-tickets`, `triage` | `grilling`, `domain-modeling`, `codebase-design`, `research`, `prototype`, `triaging`, `harden` |
| Build | `build` | `building`, `delegating`, `implement-issue`, `tdd`, `diagnosing-bugs` |
| Review | `review` (also model-invoked), `review-panel`, `improve-architecture` | `review` |
| Ship | `prepare-release-notes`, `close-epic`, `retro` | `pr` |
| Write and talk | `eli5` | `writing-for-humans`, `writing-for-agents` |
| Meta | `setup-spp`, `ask-spp`, `chief-of-staff` | |

## Why the model-invoked ones are safe to reach unprompted

- `implement-issue` acts only on an issue carrying the ticket contract, and `review` adds its spec verdict only when a ticket is linked.
- `harden` writes the contract into one issue it was handed; `spp lint` gates the result.
- `triaging` moves one issue it was handed, and applies a role only after the person's word (#409). `triage` picks the issue and hands it to `delegating`, which runs `triaging` here or in a sub-session.
- `discuss` writes nothing on its own, and files an issue only when the person says yes to its offer.
- The rest read or write prose and post nothing on their own.

## How `building` reaches the panel

`build` hands off to `delegating`, which runs `building` here or in a sub-session. `building` is model-invoked and `review-panel` is user-invoked, so `building` cannot call it as a skill. When the Epic crosses the size thresholds, `building` walks `review-panel`'s own steps at the main gate, reading them from its files: the panel folder, the Personas, the `spp:review-panel` workflow started with the pull request number, then `spp findings merge --verdict`. The workflow is a pure fan-out of the Persona reviewers and holds no panel logic. Reading another skill's steps this way is the one exception [invocation.md](../invocation.md) records, ruled in Epic #197's Spec deltas (F4). A person can still type `/review-panel` on any pull request to main.

`scripts/check-invocation.ts` enforces the rule: any `Call the Skill tool with "x"` or agent `skills:` preload naming a user-invoked skill fails CI.
