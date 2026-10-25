## What it does

`sync-progress` owns the bookkeeping the SDD skills leave on GitHub issues: one **marker comment** per marker per issue, found by a hidden HTML marker on its first line and **rewritten in place** on every update, never appended. It also owns the claim mark (the `claimed` label) and the **hand-back**, the one call a worker makes when it stops on a ticket without a PR.

Callers never write an owned comment's body. A skill names the comment and the fields it sets (`progress 103 --status pr-open --pr 57`), and one script reads the existing comment, keeps every field the caller did not pass, renders the lines you see, and stores the state in a hidden data trailer on the last line. Two skills writing the same comment can no longer erase each other's lines, and the retro reads numbers from the trailer instead of guessing them from prose.

| Marker | Lives on | Written by |
| --- | --- | --- |
| `<!-- sdd-progress -->` | a sub-issue | [implement-issue](../engineering/implement-issue.md), [review-pr](../engineering/review-pr.md) |
| `<!-- sdd-plan -->` | the epic | [to-tickets](../engineering/to-tickets.md) (SDD pass), [build-epic](../engineering/build-epic.md) |
| `<!-- sdd-wave -->` | the epic | [build-epic](../engineering/build-epic.md), [review-panel](../engineering/review-panel.md) |
| `<!-- sdd-summary -->`, `<!-- sdd-retro -->` | the epic | [close-epic](../engineering/close-epic.md) |

The progress, plan and wave comments have shapes the script owns. The summary and retro have one writer each, so they stay a plain upsert of a body the writer composes.

## When to reach for it

Type `/sync-progress`, or the agent reaches for it automatically when a task fits: whenever another SDD skill records status, claims a ticket, or hands one back. You rarely type it yourself. It is a reference skill, like [codebase-design](../engineering/codebase-design.md): the shapes live here once, so every skill that writes a marker writes the same thing.

## The hand-back

A worker that cannot finish a ticket without guessing stops and hands it back, with a reason. One call routes the issue, clears the claim, and records why:

| Route | When | Labels |
| --- | --- | --- |
| `needs-info` | the ticket is ambiguous or contradicts the code | adds `needs-info`, removes `ready-for-agent` |
| `ready-for-human` | a human decision or a secret is needed | adds `ready-for-human`, removes `ready-for-agent` |
| `blocked` | a blocker the tracker did not know about | adds `blocked` and the native blocked-by edge |

The progress comment then reads `**Status:** handed-back` with a `**Handed back:** <route>: <reason>` line, and the ticket's `claimed` label is gone, so it is visibly back in a queue rather than silently held.

## Common questions

**Where did the GitLab and local-tracker claim instructions go?**
They were removed. The SDD pipeline runs on GitHub Issues alone, so the claim had one real adapter; extending it beyond GitHub is tracked in [#4](https://github.com/syn54x/skills-plus-plus/issues/4). The claim itself is unchanged: the `claimed` label, never an assignee.

**What is the `<!-- sdd-data: … -->` line at the bottom of a comment?**
The comment's state, base64-encoded JSON, for the SDD skills to read back. GitHub hides HTML comments, so you only see it in the raw body. Leave it alone; an edit by hand that breaks it makes the next write render the comment fresh from the fields that write passes.

**A comment written before this change has no trailer. Does that break anything?**
No. The first write through the script renders it fresh from the fields that write passes. An epic built across the upgrade can lose earlier prose on its wave comment; the retro keeps reading the old line format as a fallback.

## It's working if

- No issue ever has two comments starting with the same `<!-- sdd-… -->` marker.
- The wave comment on an epic lists every wave with its `Edges added:` line, plus each panel round, instead of only the latest write.
- An issue carries the `claimed` label while a worker builds it. A worker that stops without a PR leaves the issue with `needs-info`, `ready-for-human` or `blocked`, no `claimed` label, and a progress comment saying `handed-back` and why.
- No agent ever sets an assignee, and the progress comment's Worker line names who holds the ticket.

## Where it fits

`sync-progress` is the **shared bookkeeping layer** under the SDD chain rather than a step in it. [ask-syn54x](../engineering/ask-syn54x.md) routes the whole set.
