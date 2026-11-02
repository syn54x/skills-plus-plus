---
name: domain-modeling
description: Build and sharpen a project's domain model, its glossary of terms and its ADRs, while a design is being discussed. Use when a term is vague, overloaded or used against the glossary, when writing or editing a glossary or an ADR, or when a hard-to-reverse decision has just been made.
---

The active work of changing a project's domain model: challenging the words people use, settling them in the glossary, and recording the few decisions that earn an ADR, each at the moment it happens. Reading the glossary to borrow its terms needs no skill; this one is for changing the model.

## Find the domain docs

Before the first write, work out where the glossary and the ADRs live, in this order, and stop at the first that answers:

1. The repo's `CLAUDE.md` or `AGENTS.md`: the domain docs section `/setup-spp` writes, and the documents on the Routing block's Laws line.
2. What is already there: a `GLOSSARY-MAP.md` or `GLOSSARY.md` at the root, and a directory holding numbered ADR files (`0001-*.md`), found by searching the repo.
3. The person: ask where each should go, with a recommendation, and suggest `/setup-spp` so the answer is recorded for the next session.

Every path below means the location found here. Create a file only when there is something to write into it.

A `GLOSSARY-MAP.md` means the repo has several contexts, each with its own glossary and possibly its own ADRs. Work out which context the current topic belongs to, and ask when it is unclear.

## While the design is discussed

- **Challenge against the glossary.** When a term is used in a sense the glossary defines differently, say so at once and ask which is meant.
- **Sharpen.** When a word is vague or doing several jobs, propose one precise term for each meaning.
- **Probe with scenarios.** When concepts meet, invent a concrete edge case that forces the boundary between them to be stated.
- **Check the code.** When someone states how the system behaves, read the code. When the two disagree, quote the code and ask which is right.

## Write a term when it settles

The moment a term is settled, write it to the glossary; never save terms up for the end. The format and the rules for what belongs are in [`GLOSSARY-FORMAT.md`](GLOSSARY-FORMAT.md); read it before the first glossary write of the session.

The glossary holds vocabulary and nothing else. A decision, a requirement or an implementation detail stays out of it, however recently it was agreed.

## Offer an ADR only when it earns one

Offer an ADR only when the decision is all three:

1. **Hard to reverse**: changing course later has a real cost.
2. **Surprising without context**: a future reader would ask why it was done this way.
3. **A real trade-off**: there were genuine alternatives, and one was chosen for reasons.

When any of the three is missing, write no ADR and say which test failed. When the person accepts, write it with [`ADR-FORMAT.md`](ADR-FORMAT.md).

## Done when

- Every term settled in the session is in the glossary, in its format, and nothing else was added there.
- Every ADR written passes all three tests, and every decision that passed was offered one.
