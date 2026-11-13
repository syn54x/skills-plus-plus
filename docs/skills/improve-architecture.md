## What it does

`improve-architecture` looks for **Deepening opportunities**: modules that make their callers learn nearly as much as the module does for them, and that would serve better folded into something deeper. It finds them with the Depth check, the same four questions the review gates ask, at one of two scopes:

| You type | It reads | You get |
| --- | --- | --- |
| `/improve-architecture` | The repo's hot spots: the files its recent history changed most | An HTML page in the session's scratch directory: opportunities ranked by Strength and churn, each drawn from one caller's point of view |
| `/improve-architecture src/billing` | That area of the repo | The same page, for that area |
| `/improve-architecture 412` (or `pr`, or a pull request URL) | Every module the pull request touches | A Markdown summary in the conversation, each opportunity with a Timing and a Strength, and an offer to put it on the pull request as a comment |

It reports ideas and never gives a verdict. Nothing it says approves, blocks or holds a merge, and it changes no code. You pick the opportunity worth your time, it grills that one with you (rival interface designs included, when the shape is the open question), and each one you accept is filed as an issue, ready for the single-issue path or the Epic path.

## When to reach for it

You type `/improve-architecture`; the agent never starts it on its own.

Run it over the repo when a part of the codebase keeps resisting change, when tests are hard to write through the interfaces you have, or before a stretch of work in an area you want to leave in better shape. Run it over a pull request when you want to know what that change did to the shape of the code while its author still has the files open.

| Your situation | Use |
| --- | --- |
| You want ideas for deepening, to explore and maybe file | `/improve-architecture` |
| You want a pass or fail on a pull request | the review gate, which reports a fired Depth check as an ordinary finding |
| You want only the words, for designing one module yourself | [codebase-design](codebase-design.md) |

It is the fourth of spp's five paths, the scans path, shared with [test-audit](test-audit.md): the issues it files enter path 1 (an Epic) or path 2 (a single issue). The ask-spp router covers every skill when the right one is unclear.

## Timing and Strength

Every opportunity carries a **Strength**: `Strong` when the deepening clearly pays and its shape is plain, `Worth exploring` when it likely pays but the shape is open, `Speculative` when it pays only if a change nobody has planned comes along.

In a pull request, each one also carries a **Timing**:

| Timing | Means |
| --- | --- |
| `This PR` | The fix stays inside files the pull request already rewrites |
| `Follow-up` | The fix is real but reaches past those files |
| `Leave it` | The shallowness is old and costs little to keep, or an ADR chose it |

`Leave it` opportunities still appear in the report. A review gate drops them; here they are worth seeing, because the reason to leave one alone may since have changed.

## Common questions

**Why does it read only part of my repo?**
Deepening a module pays off when that module next changes. Code nobody touches gives a refactor nothing to repay, so with no area named it starts from the files the last six months of commits changed most. Name an area after the command to point it elsewhere.

**What separates this from a fired Depth check at a review gate?**
The questions are the same; [codebase-design](codebase-design.md) holds the single copy. At a gate, a fired question becomes a finding, rated by severity, that asks for a fix. Here, the same fired question is an idea for you to explore, accept or drop, and nothing waits on your answer.

**Will it comment on my pull request?**
Only if you say yes to the one question it asks after showing the summary. Agreeing that an opportunity is good is not that yes. It files issues the same way: it shows you each issue body first and files it only when you say so.

**Where does the repo report go?**
To the session's scratch directory (the OS temp directory when there is none), never into the repo. It opens the file for you where it can, and always gives you the path.

**What happens when I pick an opportunity?**
[grilling](grilling.md) runs the interview, starting with whether the change is worth making now and ending with how callers move over to the new interface. [domain-modeling](domain-modeling.md) runs beside it and records any new name or lasting decision. If you drop an idea for a reason that will still hold next time, expect an ADR offer, since the next survey would otherwise find the same module again.

**What became of improve-codebase-architecture and improve-pr-architecture?**
`improve-architecture` replaces both. The argument chooses the scope that used to be a separate command, and filing the accepted opportunities as issues is new.

## It's working if

- Each opportunity points at a real caller and says what that caller would stop having to know.
- The repo page ends with the modules it read and found nothing in, so you can see how far it looked.
- Nothing in your checkout changed except, at most, glossary entries and ADRs you agreed to.
- No comment reached your pull request, and no issue was filed, without your yes.
- Each accepted opportunity ends as an issue that names its path and what the grilling settled.
