## What it does

`ask-spp` is the router over every spp skill. You say what you are trying to do, and it names the path that fits, the command to type now and the step after it. For example:

```text
/ask-spp someone filed a bug about the export timing out
```

It answers with the single-issue path: `/triage <N>` first, which hardens the bug so its reproduction becomes the Verify block, then `/build <N>`.

It only recommends. It starts no skill, writes no file and opens no issue, so the next move is always yours to type. Its map is written by hand and checked in CI against the skills that exist, so it never names a skill that is gone or misses one that was added.

## When to reach for it

You type `/ask-spp`, with your situation after it or alone to describe the situation in the conversation so far; the agent never starts it on its own. Reach for it when you do not know which skill fits, or when two look interchangeable. When you already know the skill, type that skill instead.

The routes it gives are the [five paths](../paths.md):

| Your situation | Where it sends you |
| --- | --- |
| A change too large for one session, with a visible route | The Epic path, starting at [grill](grill.md) |
| A filed bug or enhancement | The single-issue path, starting at [triage](triage.md) |
| An effort too large for one sitting, route unclear | The unknown-territory path, starting at [wayfinder](wayfinder.md) |
| Code that resists change | The architecture path, [improve-architecture](improve-architecture.md) |
| A change one session finishes, with nothing filed | No spp at all |

## Paths, not keywords

The router's leading idea is the **path**: a route through several skills, from the situation you are in to merged work. It finds where on a path your situation sits rather than matching your words to the nearest skill, which is why it tells you what comes after the command it gives. Where two skills sit close together, it names the fact that decides between them: [grill](grill.md) or [wayfinder](wayfinder.md) turns on whether one sitting can settle every decision, and [to-spec](to-spec.md) or [triage](triage.md) on whether the work needs several Sub-issues.

## Common questions

**Where does a small filed bug go?**
To `/triage <N>`, then `/build <N>`. `build` takes a hardened One-off of any size as readily as an Epic, so no other command is involved.

**It described a skill, and the skill does something else.**
The router holds one line per skill, which orients but does not specify. It is told to read a skill's `SKILL.md` before saying more than that line or advising you to skip a step. Before acting on an answer that came from the line alone, have it read the skill's `SKILL.md` and answer again.

## It's working if

- Its reply ends on a command for you to type, and nothing has started.
- The reply says what comes after that command, not only the command.
- When two skills fit, it gives the one fact that separates them.
- Before it says more about a skill than a one-line summary, you see it open that skill's `SKILL.md`.
