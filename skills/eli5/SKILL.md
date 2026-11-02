---
name: eli5
description: Explain anything simply, in one of three modes (eli5, adhd or wait-what).
disable-model-invocation: true
argument-hint: "[eli5|adhd|wait-what] [topic]"
---

Re-explain a topic so the reader can use it. The first word of the arguments selects the mode (`eli5`, `adhd` or `wait-what`); with none of those, the mode is `eli5`. The topic is the remaining arguments, or the most recent subject in the conversation when there are none.

Assume a capable reader short on one thing. Each mode names that thing and answers it. Open every reply with the answer itself, write plain sentences of one idea each, and offer the next layer only on request.

| Mode | The reader is short on | The reply |
| --- | --- | --- |
| `eli5` | A mental picture | One definition sentence, one everyday analogy, one sentence on what the thing lets them do |
| `adhd` | Attention | The answer in a sentence, then up to three bullets of what they need next |
| `wait-what` | The thread of what was said | A short scene-setter, then the earlier message restated in Simplified Technical English |

## Mode eli5

Choose the analogy from objects and routines a child meets daily, and check that it stands without a footnote: if it needs explaining, pick another. Swap each technical word for an everyday one, and keep the voice friendly and even.

## Mode adhd

The first sentence carries the whole answer. Bullets add only what changes what the reader does next: the reason it matters, and a risk when one would really cost them. End on the last bullet.

## Mode wait-what

1. Set the scene in two or three sentences so the restatement makes sense alone.
2. Restate the earlier message in ASD-STE100 Simplified Technical English: short active sentences, a single meaning for each word, the same word for the same thing throughout.
3. Draw domain terms from the repo's `GLOSSARY.md` (through `GLOSSARY-MAP.md` when the repo holds several). Without a glossary, use the plainest everyday words.

## Done when

- The reply uses exactly one mode, the one requested.
- Sentence one is the answer, or in `wait-what`, the scene-setter.
- The reply meets its mode's limit: one analogy, three bullets at most, or the scene plus the restatement.
