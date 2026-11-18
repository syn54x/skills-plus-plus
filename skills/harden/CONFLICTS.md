# The conflict check

Before you write the body, check every literal the contract mandates against what is in force and against the rest of the contract. A worker told to write something an ADR, a glossary `_Avoid_` line or the contract's own text rules out either breaks the rule or comes back with a question, and the contract is amended mid-build.

## What a mandated literal is

Anything the contract tells the worker to write or assert exactly: a name, a value, text a user sees, the text of a glossary entry or an ADR, a Verify pattern.

## What is in force

- The ADRs and Laws documents that cover the issue's owned paths, and `GLOSSARY.md`, as they stand on the base branch.
- Domain docs edits that sit uncommitted in this checkout.
- The text an Epic's domain docs slice carries in its body.
- The text a blocker of this issue carries in its body.

The last three are not on the base branch, so read them where they are.

## Three comparisons

1. No mandated literal contradicts a decision in an ADR or a Laws document in force.
2. No mandated name or user-facing text uses a word a glossary `_Avoid_` line lists, outside that `_Avoid_` line itself.
3. No part of the contract rules out another part. A Verify pattern that bans a word must not match text the contract mandates elsewhere (an `_Avoid_` line that names the retired word, a dated record the contract says to leave alone), and no criterion and scenario ask for opposite results.

For `report --since`, suppose the glossary says `**Cutoff**` with `_Avoid_: since-date`. The plan asks for help text reading "entries after the since-date", for a new glossary entry `**Window**` whose own line is `_Avoid_: since-date`, and for the Verify line `! git grep -qi since-date -- src GLOSSARY.md`. The help text breaks comparison 2. The grep breaks comparison 3, because it matches the `_Avoid_` line the contract mandates in `GLOSSARY.md`.

## What to do with a conflict

Settle it in the contract, siding with the ADR or the glossary: change the literal, or narrow the Verify pattern so it spares the mandated text. In the example the help text says "entries after the cutoff", and the grep searches `src` alone.

When the issue's intent needs the contradiction (it means to reverse the decision and no domain docs edit says so), it is a gap for a person. List it under **Still open** with the ADR's sentence quoted, and the issue ends in `needs-info`.
