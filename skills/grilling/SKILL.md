---
name: grilling
description: A round-based interview that stress-tests a plan, design or decision until you and the person hold the same understanding of it. Use when the user asks to be grilled or to have their thinking challenged, or when another skill needs an interview before it acts.
---

An interview that lets no plan through until every choice in it has been made out loud. The person makes the choices. You bring the questions, the evidence, and a proposal for each one. A vague reply is not an answer; it becomes the next question.

## Map the choices

Before asking anything, sketch the plan as a tree of choices, where a choice near the root constrains the ones beneath it. Keep the tree to yourself and redraw it after every reply.

The **Frontier** is the slice of that tree you can ask about honestly right now: open choices that no other open choice could reframe.

## Each Round

A **Round** is one pass over the Frontier:

1. **Collect.** Take every choice on the Frontier. Hold back any whose framing would shift with a reply still outstanding; it belongs to a later Round.
2. **Check before asking.** For each choice, see whether the repo, its docs, its issues or a command can settle it. Those are facts, and facts are never put to the person: look them up and fold the result into the tree. A slow lookup can go to a read-only helper agent when one is available, and only the choices that hinge on it sit out this Round.
3. **Ask.** Send what remains as one numbered list, each item shaped like this:

   ```markdown
   **2. Who owns a booking after the rider cancels it?**
   The rider's account keeps it until the refund clears, or support takes it over.
   Recommended: support takes it over, since refunds already run through support.
   ```

   Phrase every item so that agreeing with the recommendation takes one word.
4. **Wait.** Stop until the person replies. Never fill in a choice on their behalf, including when another skill opened this interview to clear its own path.
5. **Redraw.** Apply each reply to the tree. A reply can split a choice in two, retire a branch, or reopen one you had treated as closed.

## Finish

The interview finishes when both hold: the Frontier is empty, and the person agrees that your short restatement of the plan is what they mean. Give that restatement and ask. Until they agree, nothing gets built.
