# Glossary format

How a glossary file is laid out and what earns a place in it.

## Layout

```markdown
# <Context name> glossary

<One or two sentences: what this context covers.>

## Language

**Shipment**:
One dispatch of goods to one address. An order may need several.
_Avoid_: delivery, parcel

**Carrier**:
The company that moves a shipment between warehouse and customer.
_Avoid_: courier, provider

## Relationships

- An **Order** produces one or more **Shipments**.

## Flagged ambiguities

- "delivery" was used for both a **Shipment** and its arrival; it now means neither.
```

`Relationships` and `Flagged ambiguities` appear only when there is something to put in them. Group terms under `###` subheadings once clusters appear; a short glossary stays a flat list.

## What earns an entry

- **One word per concept.** Choose the best term and list its rivals under `_Avoid_`, so the rivals stop appearing.
- **Define what the thing is**, in one or two sentences. What it does, how it is built and where it is stored belong elsewhere.
- **Only this project's concepts.** A term any programmer already knows (a retry, a cache, a timeout) stays out, however often the project uses it.
- **Remove as readily as you add.** A term the project no longer uses, or a definition that has grown a spec inside it, is cut in the same edit that notices it.

## Several contexts

A `GLOSSARY-MAP.md` at the root lists each context, where its glossary lives and how the contexts relate:

```markdown
# Glossary map

- [Ordering](./src/ordering/GLOSSARY.md): takes and tracks orders
- [Fulfilment](./src/fulfilment/GLOSSARY.md): picks, packs and ships them

## Relationships

- Ordering publishes `OrderPlaced`; Fulfilment starts a pick from it.
```

Split a single glossary into contexts only when it is already lean and still spans two areas a reader would not want to hold at once. Splitting a bloated glossary yields several bloated ones.
