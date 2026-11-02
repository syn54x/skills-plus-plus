## What it does

`grill` puts your plan or design through an interview until you and the agent agree on every choice in it, and while that happens it keeps your repo's glossary and ADRs current. It is the single grilling command in spp, replacing the earlier pair where one wrote docs and the other did not.

Two skills do the work. [grilling](grilling.md) runs the interview: Rounds of questions with a recommendation on each, until no choice is left open and you confirm the agent's restatement. [domain-modeling](domain-modeling.md) runs beside it, writing a term into the glossary as soon as you agree on it, and offering an ADR for the rare decision that a later reader would otherwise undo. All the other choices stay in the conversation, which is exactly what to-spec reads from next.

## When to reach for it

You type `/grill`; the agent never starts it on its own. Put the subject after the command (`/grill pricing rides at booking`), or type it alone to grill the plan already under discussion.

Use it early in a change, while the plan is still loose and people are still using different words for the same thing. It is the first step of the Epic path: grill, then to-spec in the same conversation, then to-tickets.

| Your situation | Use |
| --- | --- |
| You want to answer every question yourself | `/grill` |
| Most answers can be cited from the repo and its docs | auto-grill, which answers those and asks you the rest |
| The effort is too large for one sitting | wayfinder, which maps it first |

`ask-spp` routes between every skill when the right one is unclear.

## Prerequisites

Nothing to prepare. The glossary and ADRs go where your repo already keeps them: domain-modeling looks in your `CLAUDE.md` or `AGENTS.md` first (setup-spp writes the locations there), then at the files that exist, and asks you only when neither tells it. A file is created when its first entry is written.

## What lands where

| What you agreed | Where it is kept |
| --- | --- |
| A term: the word this project uses for a thing | The glossary, in the same turn |
| A decision that would be costly to undo, puzzling to a newcomer, and chosen over a credible rival | An ADR, if you accept the offer |
| Any other choice | The conversation, until to-spec writes it into the Epic |

## Common questions

**The session ended and no files changed.**
Most likely nothing qualified: the plan introduced no new words, and none of its choices passed all three ADR questions. The interview still did its job, and its results are in the conversation.

**Where are the choices that are not in the glossary or an ADR?**
In the conversation, deliberately. Run to-spec there before clearing it, then check the Epic it writes against what you said.

**Can it document a repo that has no glossary yet?**
Yes: say so after the command (`/grill write a glossary for this repo`). The session is long, because the agent reads the code and asks you which of the words it finds should stand.

**What became of grill-me and grill-with-docs?**
Both are replaced by `grill`. Inside a repo the glossary and ADRs are nearly always wanted, and a session that settles no terms and no lasting decisions writes nothing anyway.

## It's working if

- Glossary entries appear one at a time as the session goes, each in the turn its term was agreed.
- ADR offers are rare, and each one is a choice you would hate to defend again.
- It stops you when you use a word in a sense your glossary defines differently.
- It closes by telling you to run to-spec, rather than starting to build.
