## What it does

`eli5` explains anything simply, in one of three modes. The first word of the arguments picks the mode, and without one the mode is `eli5`.

| Mode | The reply |
| --- | --- |
| `eli5` | What the thing is, one everyday analogy, and why it matters |
| `adhd` | The point first, then at most three bullets, then nothing more |
| `wait-what` | Context, then a re-pitch of the last message in Simplified Technical English, using the terms in `GLOSSARY.md` |

All three assume the reader is smart and lacks only context, time or attention. Each gives the point first in short sentences and stops, so a deeper layer arrives only when you ask for it.

## When to reach for it

You type `/eli5`, `/eli5 adhd` or `/eli5 wait-what`, followed by a topic if you have one; the agent never starts it on its own. Without a topic it explains the last thing said in the conversation. `ask-spp` routes between every skill when the right one is unclear.

Pick the mode by what is in short supply:

| You are missing | Use |
| --- | --- |
| A mental picture | `eli5` |
| Attention for the long version | `adhd` |
| The thread of what was just said | `wait-what` |

## Common questions

**What does `/eli5` do with no arguments?**
It runs `eli5` mode on the last thing said in the conversation.

**What is Simplified Technical English?**
ASD-STE100, a controlled style used in aircraft manuals: short active sentences, one meaning per word, and the same word every time for the same thing. `wait-what` uses it so a message you could not follow comes back in plain, consistent terms.

**Which terms does `wait-what` use?**
Those in the repo's `GLOSSARY.md`, so the re-pitch uses the words the project uses. A repo with several glossaries is routed through `GLOSSARY-MAP.md`. A repo with no glossary gets the plainest everyday words.

**Why is `adhd` capped at three bullets?**
A short answer you finish beats a thorough one you abandon. Ask for the next layer and you get it.

## It's working if

- The first sentence is the point.
- `eli5` carries exactly one analogy, and it needs no explanation of its own.
- `adhd` ends after three bullets or fewer.
- `wait-what` opens with context and uses the repo's own terms.
