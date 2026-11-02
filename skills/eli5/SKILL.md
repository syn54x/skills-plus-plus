---
name: eli5
description: Explain anything simply, in one of three modes (eli5, adhd or wait-what).
disable-model-invocation: true
argument-hint: "[eli5|adhd|wait-what] [topic]"
---

Explain the topic in the mode the person names. The first word of the arguments picks the mode: `eli5`, `adhd` or `wait-what`. Without one of those words the mode is `eli5`. The topic is the rest of the arguments, or when there are none, the last thing said in the conversation.

The reader is smart. What they lack is context, time or attention, so every mode below gives the point first, in short sentences, one idea each. Add a layer deeper only when they ask for it.

## Mode eli5

Explain it as to a bright five-year-old: concrete things they already know, and a plain word wherever a technical one would appear.

1. **The thing**: one sentence saying what it is.
2. **The picture**: one analogy, drawn from everyday life, that needs no explanation of its own.
3. **Why it matters**: one sentence on what it lets you do.

Keep the tone warm and level, as between equals.

## Mode adhd

Give the shortest useful answer.

1. **The point**: first, in one sentence.
2. **At most three bullets**: only what the reader needs next, in this order: why it matters, then the one catch that would actually bite them, if there is one.
3. Stop there.

## Mode wait-what

The reader missed the last message. Re-pitch it.

1. **Context**: two or three sentences that set the scene, so the message makes sense on its own.
2. **The pitch**: restate it in Simplified Technical English (ASD-STE100): short active sentences, one meaning per word, the same word for the same thing every time.
3. **Terms**: take every domain word from the repo's `GLOSSARY.md`. When the repo has several glossaries, follow `GLOSSARY-MAP.md` to the right one. A repo with no glossary gets the plainest everyday words.

## Done when

- The reply is in one mode, and that mode is the one asked for.
- The first sentence is the point.
- The reply fits its mode: one analogy for `eli5`, at most three bullets for `adhd`, context followed by the pitch for `wait-what`.
