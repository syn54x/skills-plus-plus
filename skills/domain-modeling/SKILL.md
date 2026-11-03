---
name: domain-modeling
description: Keep the glossary and ADRs accurate. Use when discussing what a term means, writing or editing GLOSSARY.md or an ADR, or right after a hard-to-reverse decision.
---

Keep a project's words and its lasting decisions honest while a design is being argued over, and write each one down as soon as it is settled. Consulting the glossary for a term is ordinary reading; this skill is for changing what the glossary and the ADRs say.

## Find the domain docs

Before the first write, work out where the glossary and the ADRs live, in this order, and stop at the first that answers:

1. The repo's `CLAUDE.md` or `AGENTS.md`: the domain docs section `/setup-spp` writes, and the documents on the Routing block's Laws line.
2. What is already there: a `GLOSSARY-MAP.md` or `GLOSSARY.md` at the root, and a directory holding numbered ADR files (`0001-*.md`), found by searching the repo.
3. The person: ask where each should go, with a recommendation, and suggest `/setup-spp` so the answer is recorded for the next session.

Every path below means the location found here. Create a file only when there is something to write into it.

A `GLOSSARY-MAP.md` means the repo has several contexts, each with its own glossary and possibly its own ADRs. Work out which context the current topic belongs to, and ask when it is unclear.

## What to listen for

| You notice | You do |
| --- | --- |
| A claim about how the system behaves | Open the code. When it disagrees, show the lines and ask which one is wrong. |
| Two concepts that sit close together | Pose one specific case that falls between them and ask which side it lands on. |
| A word the glossary defines, used in another sense | Quote the entry and ask whether the entry or the usage should change. |
| One word carrying two meanings, or a word too loose to act on | Name each meaning, offer a distinct term for each, and ask which the glossary keeps. |

## Settling a term

Write a term into the glossary in the same turn it is agreed, so nothing waits for a summary at the end. Before the session's first glossary edit, read [`GLOSSARY-FORMAT.md`](GLOSSARY-FORMAT.md) for the entry shape and the test for what belongs.

Only vocabulary goes in. A requirement, a decision or a detail of how something is built goes elsewhere, however freshly it was agreed.

## Recording a decision

An ADR exists to stop a later reader from undoing a choice that was made on purpose. Offer one only when the answer to each of these is yes:

- Would undoing the choice later cost real work?
- Would someone meeting the code cold be puzzled by it?
- Was there a credible option that lost?

When any answer is no, write no ADR and say which question failed. When the person accepts, write it following [`ADR-FORMAT.md`](ADR-FORMAT.md).

## Done when

- Every term agreed in the session is in the glossary in its format, and nothing but vocabulary was added there.
- Every ADR written has three yes answers, and every decision that had three was offered one.
