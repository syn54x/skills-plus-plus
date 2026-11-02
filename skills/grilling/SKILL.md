---
name: grilling
description: A round-based interview that stress-tests a plan, design or decision until you and the person hold the same understanding of it. Use when the user asks to be grilled or to have their thinking challenged, or when another skill needs an interview before it acts.
---

Interview the person until the two of you understand the subject the same way, with nothing left assumed. Be relentless: a vague answer is a new question, not a settled one.

## The design tree

Hold the subject as a **design tree**: each decision, with the decisions that depend on it hanging below. A decision is open until the person settles it. The **Frontier** is every open decision whose prerequisites are all settled, which is exactly what can be asked now without guessing at an answer not yet given.

## Rounds

Work in **Rounds**. A Round asks the whole Frontier at once, then stops and waits for the answers. Two questions never share a Round when one's answer could change the other; the dependent one waits for a later Round.

Lay a Round out as a numbered list, one question per item:

```markdown
**1. <short title>**
<the question, with the options when there are several>
Recommended: <the answer you would pick, and why in one line>
```

Give every question a recommended answer, and word the question so that "yes" accepts it. The person can then answer a whole Round by number.

After each Round, settle what was answered, open what the answers revealed, and work out the Frontier again from the tree. A settled decision can reopen a branch you thought closed; put it back on the Frontier.

## Facts and decisions

A fact is anything the code, the docs, the issue tracker or the environment can answer. Finding facts is your job: look each one up, never ask the person for it. When a lookup will take a while, hand it to a read-only helper agent if one is available and ask the rest of the Frontier meanwhile; only the questions that depend on that fact wait for it.

A decision is a choice between options the facts leave open. Decisions belong to the person. Put each one to them with your recommendation and wait; never settle one yourself, even when another skill started this interview to unblock its own work.

## Done

The interview is done when the Frontier is empty and the person confirms that the understanding is shared. Then say in a few lines what was decided. Act on none of it before that confirmation.
