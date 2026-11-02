## What it does

`domain-modeling` builds and sharpens your project's domain model while a design is being discussed: the glossary of the project's own words, and the ADRs that record its few hard-to-reverse decisions. It challenges a term you use against the glossary, asks for a precise word where you used a vague one, and tests a relationship with a concrete edge case until the boundary is stated.

It writes as it goes. A term lands in the glossary the moment you settle it, mid-conversation, not in a summary at the end. And it never assumes where your docs live: it finds the glossary and the ADR directory from your repo before the first write.

## When to reach for it

Type `/domain-modeling`, or the agent starts it when a task fits: a term is vague, overloaded or used against the glossary, a glossary or an ADR is being written or edited, or a decision that is hard to undo has just been made.

Most of the time it runs underneath [grill](grill.md), which pairs it with the [grilling](grilling.md) interview. Reach for it directly when the words are the problem and you want the discipline without a full interview. When the problem is a module's shape (its interface, its seam), use [codebase-design](codebase-design.md) instead. Looking a term up needs no skill: read the glossary. `ask-spp` routes between every skill when the right one is unclear.

## Finding your docs

Before it writes anything, the skill works out where the glossary and the ADRs belong, and stops at the first source that answers:

1. Your `CLAUDE.md` or `AGENTS.md`, where setup-spp records the domain docs, and the documents named on the Routing block's Laws line.
2. What is already there: a `GLOSSARY.md` or `GLOSSARY-MAP.md` at the root, and a directory of numbered ADR files.
3. You: it asks, with a recommendation, and suggests running `/setup-spp` so the answer is recorded.

This repo, for example, keeps its ADRs in `.agents/adr/`, and the skill writes there because `CLAUDE.md` says so.

## Two files, two bars

| | Glossary | ADR |
| --- | --- | --- |
| Holds | What a term means, in a sentence or two, with its rivals under `_Avoid_` | One decision: what forced it, what was chosen, why |
| Written when | A term is settled | A decision is hard to reverse, surprising without context **and** a real trade-off, and you accept the offer |
| Never holds | Decisions, requirements, implementation detail | A log of every choice in the session |

## Common questions

**My glossary keeps growing. What do I do?**
The growth is the symptom: the file has taken in decisions and implementation detail that never belonged there. Ask for exactly that cleanup ("make the glossary concise and remove anything that is not vocabulary"). Split it into contexts with a `GLOSSARY-MAP.md` only once it is lean and still covers two areas nobody wants to hold at once.

**My team already has an ADR convention.**
The skill follows the directory it finds and that directory's naming pattern, and your `CLAUDE.md` or `AGENTS.md` can state a different template, which wins.

**Does a glossary earn its keep?**
Where names cross a boundary (module names, table names, status values, issue titles, commands) a single agreed word saves real confusion. In ordinary prose it matters less, and on a one-day build you can skip it. An unreviewed glossary written by an agent is worse than none, because later sessions treat its claims as true.

**Can it invent the domain language for me?**
No. It holds you to precision once you understand the domain; vocabulary you do not understand yourself means nothing once written down.

## It's working if

- It stops you to ask which of two things you meant, rather than picking one.
- The glossary changes during the conversation, and gets shorter as often as longer.
- It declines an ADR for something you could undo tomorrow, and says which test failed.
- Its files land where your repo keeps them, never in a folder it made up.
- It quotes your code back to you when the code and what you said disagree.
