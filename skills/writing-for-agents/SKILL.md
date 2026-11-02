---
name: writing-for-agents
description: How to write a document an agent reads and then acts on, such as a skill, a CLAUDE.md or AGENTS.md, a spec or a prompt. Use when creating, editing or trimming one, when a skill nears its size budget, or when an agent follows a document unevenly from one run to the next.
---

The reference for any document an agent reads and then acts on. A good one makes the agent take the same path every run (the same process, not always the same output), and its first tool is deletion. When drafting, write with each section below in mind. When reviewing, walk the draft through every section in order and fix what each one finds.

## The two loads

Every line you add is paid for from one of two budgets.

- **Context load** is what sits in the agent's window on every turn: each line of `CLAUDE.md`, the description of every model-invoked skill. It costs tokens and attention whether or not it ever fires.
- **Cognitive load** is what the person has to remember: what documents there are and the moment each one is wanted. The person is the index. Spend this budget where a human choice matters, because it is the price of keeping a person in charge; remove it where nothing needs choosing.

Inline or disclose, split or merge, model-invoked or user-invoked: each is this one trade made in a different place.

## Context pointers

A **pointer** is a line in context that names material outside it and says when to fetch it. A skill's description, a `CLAUDE.md` line naming a doc and "at step 4, read `REVIEW.md`" are all pointers. Its wording, not its target, decides whether the agent follows it. When an agent ignores material it needed, reword the pointer first; inline the material only if rewording fails.

A pointer says what the material is, then lists each distinct case that should fetch it.

- Put the leading word first, where the triggering happens.
- Give each case one phrase. Synonyms for the same case are one case written twice.
- Leave out what the target already says about itself.

## Progressive disclosure

A document holds **steps** (actions, in order) and **reference** (facts and rules consulted when needed), and places each piece on one of three tiers, by how soon the agent needs it:

1. a step in the main file;
2. reference in the main file;
3. reference in another file, reached by a pointer.

The test is the path. Material every run needs stays in the main file. Material only some runs need moves to a reference file in the same folder, and its pointer sits at the step that needs it, never in a list at the top: a pointer read too early either loads everything up front or is forgotten by the time it matters.

Keep a concept together under one heading (its definition, its rules, its exceptions) so that reading any part brings the rest along.

The failure here is **sprawl**: a main file too long for the agent to attend to evenly, even when every line is live. The cure is to move material down the tiers and to split by path, never to shave words off each line.

## Completion criteria

Every step ends on a condition the agent can observe as true or false. Two dials set its strength.

- **Clarity.** "Understand the module" ends whenever the agent feels like moving on. "Every caller of `parse` listed with its file and line" ends when it is true. A vague end with later steps in view invites **premature completion**: attention drifts to the next step before this one is done. Sharpen the criterion first. Only when it cannot be sharpened and you have seen the rush, move the later steps across a real context boundary (a separate skill run by another agent, a hand-off); an inline call leaves them in view and hides nothing.
- **Demand.** "Every", "each" and "all" make the agent dig, and they bind a list of rules as firmly as a list of steps.

The strongest criterion is both observable and exhaustive.

### Standing rules

A rule the agent obeys while working (a `CLAUDE.md` law, an `AGENTS.md` invariant) is a completion criterion that never disarms, so it takes the same shape, in this order:

1. **Trigger**: the moment it applies.
2. **Check**: the observable state that satisfies it.
3. **Incident**: what happened that made the rule, last and optional.

A rule written as a story has no moment to fire at.

- Before: "We once shipped a migration that locked the users table for ten minutes, so be careful with migrations."
- After: "Before adding a migration that alters a table of over a million rows, write it as an online migration; the check is that the migration plan reports no table lock. (A blocking `ALTER` once held `users` for ten minutes.)"

## Leading words

A **leading word** is a short term the model already knows well (*tracer bullet*, *red*, *tight loop*, *fog of war*) used as a handle for a whole behaviour. Repeat the word; never repeat its definition. It works twice: in the body, the agent does the same thing each time the word appears; in a pointer, it matches the vocabulary the person already types, so the material gets fetched. Prefer a word with meaning the model already holds. An invented word costs a definition and recruits nothing.

Hunt for phrases a single word can retire. "Small, fast and repeatable" becomes *tight*. "A failing test you trust" becomes *red*, which is either true or not.

A word too weak to move the agent off its default (*careful*, when it is already fairly careful) changes nothing. Replace it with a stronger word (*relentless*), not with more words.

### Negation

Naming a forbidden behaviour primes it. "Do not write long comments" puts long comments in mind, and the "not" is the weaker half of the sentence. Write the target instead: "Write one-line comments." Keep a prohibition only for a hard guardrail with no positive form, and state the positive target beside it.

## Pruning

- **One source of truth per meaning.** A second copy drifts, costs tokens twice, and makes its meaning look more important than it is. Repeating a leading word is fine; restating what it means is duplication.
- **Leave the environment to itself.** `package.json` scripts, config files, `--help` output and the directory layout are already sources of truth, and a document that restates them is a cache that goes stale. Write down only what no lookup returns: a convention nobody wrote down, why a choice was made, a trap no config admits to.
- **The no-op test**, sentence by sentence: does the agent act differently with this sentence than without it? If not, delete the whole sentence rather than trimming it. When two people disagree about a sentence, they disagree about the model's default; settle it by running the document.
- **Relevance.** A line that no longer bears on what the document does is sediment. Remove it in the change that made it stale, while the reason is still known.

## Splitting a document

A split spends one of the two loads, so make one only when it pays.

| Split | When |
| --- | --- |
| By sequence | Later steps in view tempt the agent to rush the current one (see Completion criteria). Merging two sequences does the reverse. |
| By path | Only some runs take a branch, so its material moves to a reference file (see Progressive disclosure). |
| By invocation | Skills only; see `SKILLS.md`. |

## Writing a skill

When the document is a skill, read [`SKILLS.md`](SKILLS.md) now for the frontmatter, the model-invoked versus user-invoked trade, how to call another skill, router skills and harness reference files. Two laws bind every skill.

### Size budget

Claude Code re-attaches about 5,000 tokens of a skill after compaction, and anything past that is dropped without a warning. So:

| File | Limit |
| --- | --- |
| `SKILL.md` | 12 KB (about 3,000 tokens) |
| Frontmatter `description` | 1,024 characters |
| Any other `.md` file in the skill folder | 20 KB |

When a skill runs over, run the no-op test first, then move detail into a reference file in the same folder and point to it from the step that needs it.

### Portability

A skill outlives the harness it was written on. Three rules keep a port to new files rather than a rewrite:

1. **Features only one harness has sit at the edges.** Session drivers, workflows, hooks and panes are reached behind a check that the capability is present, and the skill still works when it is not.
2. **Skills name capabilities, never harness tools.** "Start an isolated worker" and "post a progress note" travel; a specific tool's name does not.
3. **Each harness's specifics live in one reference file**, read only when running on that harness. It maps each capability the skill names to that harness's tool or command.

A port then adds a reference file, a driver and a manifest, and the skill text stays as it is.

## Done when

- Every sentence passes the no-op test, and no meaning is stated twice.
- Every step ends on a criterion the agent can observe.
- Material only some runs need sits behind a pointer at the step that needs it.
- For a skill: inside the size budget, and no harness tool is named outside a harness reference file.
