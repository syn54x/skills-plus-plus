# Epic body

Use these headings, in this order. Write in the glossary's words.

## Problem Statement

What is wrong or missing, told from the point of view of the person who lives with it.

## Solution

What changes for that person once the Epic ships.

## User Stories

Number the stories and write many of them, each in the form `As a <role>, I want <capability>, so that <benefit>`. Cover every behaviour in the plan, including failures and edge cases the conversation raised. A story that no part of the plan supports does not belong.

## Implementation Decisions

Each decision the conversation settled that shapes the build:

- the modules built or changed, and the promises each makes at its interface;
- schema changes and contracts between parts;
- technical points the person stated;
- architectural choices, with the reason when it was given.

Leave out file paths and code, because both go stale before the Epic is built. One exception: a prototype that fixes a decision more exactly than prose can (a state machine, a schema, a type shape) may have its decision-bearing lines quoted under that decision, with a note that a prototype produced them. Quote the few lines that carry the decision.

## Testing Decisions

- What a good test means here: it drives behaviour through a seam and asserts what comes out, never how it is built inside.
- The seams the person confirmed, each with what it covers.
- Prior art: tests already in the repo that a new one should resemble.

## Out of Scope

What this Epic deliberately does not do, including anything the person refused during the conversation.

## Further Notes

Anything else a builder should know that fits none of the sections above.
