# Glossary format

The shape of a glossary entry, the file around it, and the test an entry has to pass.

## An entry

An entry is a bold term, a definition of one or two sentences, and an optional line of rejected words:

```markdown
**Hold**:
A patron's place in the queue for a copy that is out on Loan. It lapses if not collected within a week of the copy coming back.
_Avoid_: reservation, request
```

The definition says what the thing is in this project. How it is stored, which service computes it and which screen shows it belong in code and specs. The `_Avoid_` line lists the words people reach for instead, so the agreed word wins in issues, code and conversation.

## Does it belong?

Add an entry only when every answer is yes:

- Would two people on this project otherwise use different words for it, or one word for different things?
- Is the meaning particular to this project, rather than something any programmer knows (a queue, a cache, a retry)?
- Can it be defined without describing a mechanism?

Removal is part of the job. When a term falls out of use, or an entry has grown into a spec, cut it in the edit that notices.

## The file

```markdown
# Lending glossary

Terms for lending physical copies to patrons and getting them back.

## Language

**Loan**:
One copy in one patron's hands, from checkout until return.
_Avoid_: borrow, issue

**Hold**:
...

## Relationships

- A **Hold** turns into a **Loan** when the patron collects the copy.
```

Add `###` subheadings once the terms fall into clusters. `Relationships`, and a `Flagged ambiguities` section for words deliberately retired, appear only when they have content.

## Several contexts

When one glossary would mix areas that nobody needs to hold at once, give each its own file and list them in a root-level `GLOSSARY-MAP.md`:

```markdown
# Glossary map

- [Rostering](./apps/rostering/GLOSSARY.md): who works which shift
- [Payroll](./apps/payroll/GLOSSARY.md): what each shift pays

## Relationships

- A closed Rostering week becomes one Payroll run.
```

Trim a glossary before splitting it; a long glossary divided in two is two long glossaries.
