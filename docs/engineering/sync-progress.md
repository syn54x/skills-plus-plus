## What it does

`sync-progress` owns the bookkeeping the SDD skills leave on GitHub issues: one comment per marker per issue, found by a hidden HTML marker on its first line and **rewritten in place** on every update, never appended. It also owns claiming (assign yourself) and unclaiming (remove the assignment), and the labels that mark an escalation.

| Marker | Lives on | Written by |
| --- | --- | --- |
| `<!-- sdd-progress -->` | a sub-issue | [implement-issue](../engineering/implement-issue.md), [review-pr](../engineering/review-pr.md) |
| `<!-- sdd-plan -->` | the epic | [to-tickets](../engineering/to-tickets.md) (SDD pass) |
| `<!-- sdd-wave -->` | the epic | [build-epic](../engineering/build-epic.md), [review-panel](../engineering/review-panel.md) |
| `<!-- sdd-summary -->`, `<!-- sdd-retro -->` | the epic | [close-epic](../engineering/close-epic.md) |

## When to reach for it

The agent reaches for it whenever another SDD skill records status; you rarely type `/sync-progress` yourself. It is a reference skill, like [codebase-design](../engineering/codebase-design.md): the format lives here once so every skill that writes a marker writes the same thing.

## It's working if

- No issue ever has two comments starting with the same `<!-- sdd-… -->` marker.
- An issue's assignee is the worker building it, and nobody once the worker stops without a PR.

## Where it fits

`sync-progress` is the **shared bookkeeping layer** under the SDD chain rather than a step in it. [ask-syn54x](../engineering/ask-syn54x.md) routes the whole set.
