# Epic body

Seven headings, in this order. Use the glossary's words in all of them.

Two rules cover every section:

- **No paths, no code.** Both are stale before the Epic is built. A prototype can earn an exception: when it settled something prose renders badly (a state machine, a schema, a type shape), paste only the few lines that decide it, directly under that decision, labelled as prototype output.
- **Source or silence.** Every line traces to the conversation, the code or the docs. A section with little behind it stays short.

## Problem Statement

What is wrong or missing, as the person who lives with it would put it.

## Solution

What that person can do or sees once the Epic has shipped.

## User Stories

Numbered, many, each shaped `As a <role>, I want <capability>, so that <benefit>`. One story per behaviour the plan promises, failures and edge cases the conversation raised included.

## Implementation Decisions

What was decided about how it is built, grouped by module where that helps. For each module: what it is for, what it promises its callers, and any schema or contract it shares with another module. Add the person's own technical instructions, and the reason behind a decision when one was given.

## Testing Decisions

A table of the confirmed seams:

| Seam | Behaviours it shows | Existing test to resemble |
| --- | --- | --- |

Above the table, one sentence on what a good test means for this feature: it enters at a seam and checks what comes out.

## Out of Scope

What the Epic leaves alone, including anything the person turned down.

## Further Notes

Whatever a builder needs that fits nowhere above.
