## What it does

`domain-modeling` keeps your project's words and its lasting decisions accurate while a design is being argued over. It catches a word used in a sense the glossary does not give it, splits a word doing two jobs into two terms, checks a claim about the system against the code, and poses a specific case that falls between two concepts until you say where it belongs.

Everything it settles is written at once: a term goes into the glossary in the turn you agree on it, not in a tidy-up at the end. Before the first write it finds out where your repo keeps its glossary and ADRs, so its files never land in a folder it invented.

## When to reach for it

Type `/domain-modeling`, or the agent starts it when a task fits: a term is vague, overloaded or used against the glossary, a glossary or an ADR is being written or edited, or a decision that would be costly to undo has been made.

It usually runs underneath [grill](grill.md), beside the [grilling](grilling.md) interview. Start it yourself when the words are what is wrong and a whole interview would be too much. When the trouble is a module's shape (its interface or its seam), [codebase-design](codebase-design.md) is the one to use. Looking a term up needs no skill: open the glossary. `ask-spp` routes between every skill when the right one is unclear.

## Finding your docs

The skill settles where to write before writing anything, and takes the first source that answers:

1. Your `CLAUDE.md` or `AGENTS.md`, where setup-spp records the domain docs, and the files on the Routing block's Laws line.
2. The files already present: a `GLOSSARY.md` or `GLOSSARY-MAP.md` at the root, and a directory of numbered ADRs.
3. You. It asks, proposes a location, and suggests `/setup-spp` so the next session knows.

This repo is an example: its ADRs live in `.agents/adr/`, and the skill writes there because `CLAUDE.md` says so.

## Glossary or ADR

| | Glossary entry | ADR |
| --- | --- | --- |
| Records | What one word means in this project, with the words it replaces | One decision, the pressure behind it, and the option that lost |
| Written when | You agree on a term | Undoing the decision would cost real work, a newcomer would be puzzled by it, and a credible option lost; and you accept the offer |
| Keeps out | Decisions, requirements, how things are built | Everyday choices that are cheap to reverse |

## Common questions

**My glossary keeps getting longer.**
Length is the symptom. Entries have picked up decisions and implementation detail that are not vocabulary. Ask for that cleanup in so many words ("trim the glossary to vocabulary only"). Split it into contexts with a `GLOSSARY-MAP.md` only after trimming, when it still spans two areas no reader needs together.

**We already have our own ADR style.**
The skill writes into the directory it finds and follows that directory's naming. A template stated in your `CLAUDE.md` or `AGENTS.md` takes precedence over its default.

**Is a glossary worth the upkeep?**
It pays most where a name crosses a boundary: module and table names, status values, issue titles, commands. In everyday prose it matters less, and a short-lived prototype can do without one. A glossary an agent wrote and nobody reviewed does harm, because later sessions take its claims as settled.

**Can it come up with the domain language for me?**
No. It holds a discussion to the precision you already have; a term written down without your own understanding behind it is noise.

## It's working if

- It interrupts to ask which of two meanings you intend, rather than guessing.
- The glossary changes during the discussion, and entries are removed about as often as they are added.
- It turns down an ADR for something cheap to reverse and names the question that failed.
- Its files land where your repo already keeps them.
- When the code and your description disagree, it shows you the code.
