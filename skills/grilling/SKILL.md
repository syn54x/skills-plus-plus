---
name: grilling
description: Interview the user, one round at a time, until a plan or design holds up. Use when the user asks to be grilled or wants their thinking stress-tested.
metadata:
  credits:
    - skill: grilling
      author: Matt Pocock
      url: "https://github.com/mattpocock/skills/tree/main/skills/productivity/grilling"
---

An interview that lets no plan through until every choice in it has been made out loud. The person makes the choices. You bring the questions, the evidence, and a proposal for each one. A vague reply is not an answer; it becomes the next question.

## Map the choices

Before asking anything, sketch the plan as a tree of choices, where a choice near the root constrains the ones beneath it. Keep the tree to yourself and redraw it after every reply.

The **Frontier** is the slice of that tree you can ask about honestly right now: open choices that no other open choice could reframe.

## Each Round

A **Round** is one pass over the Frontier:

1. **Collect.** Take every choice on the Frontier. Hold back any whose framing would shift with a reply still outstanding; it belongs to a later Round.
2. **Check before asking.** For each choice, see whether the repo, its docs, its issues or a command can settle it. Those are facts, and facts are never put to the person: look them up and fold the result into the tree. A slow lookup can go to a read-only helper agent when one is available, and only the choices that hinge on it sit out this Round.
3. **Ask.** Send what remains as one message, in this order:
   - **Read-back**, in every Round after the first: one line per reply that changed the plan, in your own words, so a misreading is caught now and not at the restatement. A reply that took the recommendation unchanged gets no line. When the skill that started this interview requires its own waiting line, that line stays first.
   - **Progress**: one line saying how many choices are settled, how many this Round asks, and the held-back choices by name, such as `Settled 9 · asking 4 · held back: refund window.` The tree itself stays private.
   - **Questions**: one numbered list, each item shaped like this:

     ```markdown
     **2. Who owns a booking after the rider cancels it?**
     A (recommended): support takes it over.
     B: the rider's account keeps it until the refund clears.
     Rests on: refunds already running through support.
     ```

     Each option sits on its own line under a capital letter, the recommended one first and marked. The `Rests on:` line names the assumption the recommendation depends on, so a person who rejects that assumption can say so in a word.
   - **Settled from the record**: each fact the Check step settled since the last Round, with its source (a file, a doc, an issue, a command), so the person can object to one.
   - **How to answer**: one closing line saying the Round can be answered with letters, such as `1A 2B`, or with `all` to take every recommendation, and that a caveat may follow any letter.
4. **Wait.** Stop until the person replies. Never fill in a choice on their behalf, including when another skill opened this interview to clear its own path.
5. **Redraw.** Apply each reply to the tree, caveats included. A reply can split a choice in two, retire a branch, or reopen one you had treated as closed.

## Finish

The interview finishes when both hold: the Frontier is empty, and the person agrees that your short restatement of the plan is what they mean. Until they agree, nothing gets built.

Give the restatement as a list, one line of the plan per item, each ending with its source:

- **You (R.I)**: the person decided it, in Round R, item I.
- **Record**: the record settles or requires it, with its pointer (a law, an ADR, a file).
- **Inferred**: you concluded it and nobody was asked.

Put the inferred lines last, under their own label, and name them as the ones to check, since the person never decided them:

```markdown
- Support takes over a cancelled booking. (You, 1.2)
- Refunds go back to the original card. (Record: ADR 0004)

**Inferred, check these:**
- A cancelled booking stays visible to the rider for 30 days. (Inferred)
```

Then ask whether the restatement is what they mean.
