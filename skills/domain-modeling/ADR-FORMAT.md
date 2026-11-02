# ADR format

How to write an ADR once a decision has passed all three tests in `SKILL.md`.

## Name and number

An ADR is one file in the repo's ADR directory, named `NNNN-<slug>.md`: the next number after the highest one already there, zero-padded to four digits, and a slug of a few lowercase words. Follow the directory's existing pattern where it differs.

## Body

The smallest useful ADR is a title and one paragraph:

```markdown
# Shipments are split at checkout, not at the warehouse

Orders that ship from two warehouses are split into Shipments when the customer pays, so the customer sees every Shipment and its cost before paying. Splitting at the warehouse kept checkout simpler but hid the second delivery charge until dispatch.
```

The paragraph says what forced the choice, what was chosen, and why it beat the alternative. Its value is recording that the decision was made on purpose, so nobody "fixes" it later.

Add a section only when it carries something the paragraph cannot:

- **Considered options**, when a rejected alternative will be proposed again unless the reason it lost is written down.
- **Consequences**, when an effect downstream is not obvious from the decision itself.
- **Status** (`proposed`, `accepted`, `superseded by NNNN`), when the repo revisits decisions. A superseded ADR stays in place and names its successor.

## Decisions that usually qualify

- The shape of the system: what is event-sourced, what is a separate service, where state lives.
- How two contexts talk to each other, and what each owns.
- A technology choice that would take weeks to undo.
- A deliberate departure from the obvious path, which a reasonable reader would otherwise reverse.
- A constraint the code cannot show: a compliance rule, a partner's contract, a latency budget.
- A boundary on scope: what the system will not do, when the refusal is not obvious.
