## What it does

`grill` interviews you about a plan or a design until you and the agent agree on it, and writes what the interview settles into your repo as it goes. It is spp's one entry point for grilling, and it replaces the two that came before it (one with docs, one without).

The interview is [grilling](grilling.md): Rounds of questions, each with a recommended answer, until nothing is left open and you confirm. Alongside it runs [domain-modeling](domain-modeling.md), so a term is written to your glossary the moment you settle it, and a decision that is hard to reverse, surprising and a real trade-off is offered an ADR. Everything else you decide stays in the conversation, which is where to-spec reads it from next.

## When to reach for it

You type `/grill`; the agent never starts it on its own. Add the subject after the command (`/grill splitting orders across warehouses`), or type it bare to grill the plan already in the conversation.

Reach for it at the start of a change, while the plan is fuzzy and the words for things are not yet agreed. It is the first step of the Epic path: grill, then to-spec in the same conversation, then to-tickets.

| What you have | Reach for |
| --- | --- |
| A plan to settle with you answering every question | `/grill` |
| A plan where most answers can be cited from the repo and its docs | auto-grill, which answers those for you and asks only the rest |
| An effort too big for one session | wayfinder, which maps it first |

`ask-spp` routes between every skill when the right one is unclear.

## Prerequisites

None to set up. The glossary and the ADRs go wherever your repo keeps them: domain-modeling reads that from your `CLAUDE.md` or `AGENTS.md` (setup-spp records it), then from the files already there, and asks you only when neither answers. Files are created when the first thing is written to them.

## What lands where

| What settled | Where it goes |
| --- | --- |
| A term: the project's word for a thing | The glossary, the moment it settles |
| A decision that is hard to reverse, surprising without context and a real trade-off | An ADR, offered to you first |
| Every other decision | The conversation, for to-spec to write up |

## Common questions

**It ran, and no glossary entry or ADR appeared.**
Usually nothing qualified. Most decisions fail at least one of the three ADR tests, and a change that introduces no new words has nothing for the glossary. A session that sharpened the plan and wrote no files has still done its job; the decisions are in the conversation.

**Where did all my other decisions go?**
Into the conversation only, by design: the glossary holds vocabulary and an ADR holds a rare kind of decision. Run to-spec in the same conversation before you clear it, and read the spec against your own answers.

**Can I use it on a repo that has no docs at all?**
Yes. Say so after the command (`/grill help me write a glossary for this repo`). Expect a long session: it reads the code and asks you which of the words already in it are the right ones.

**What happened to grill-me and grill-with-docs?**
`grill` replaces both. In a repo the glossary and ADRs are almost always wanted, and when a session settles no terms and no qualifying decisions, nothing is written anyway.

## It's working if

- The glossary changes during the session, one term at a time, not in a lump at the end.
- You are offered few ADRs, and each is a decision you would not want to argue again.
- It challenges a word you used when your glossary defines it differently.
- It ends by pointing you at to-spec, not by starting to build.
