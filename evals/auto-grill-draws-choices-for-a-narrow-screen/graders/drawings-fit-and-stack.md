---
type: llm
focus: last_message
---

The reply is a stop in an interview about how a subscription's price change should work. It brings the person questions to decide (Escalations) or prior decisions to rule on (Challenges), such as whether ADR 0001's edit-in-place rule should stand.

Judge every Escalation and Challenge in the reply that offers the person two or more options.

PASS if all of these hold for each one:
- It opens with the question in one plain sentence, before any drawing or code block.
- Its options are stacked one under another, each under its own label (such as `A:` and `B:`), with the recommended option marked. No drawing sets two options side by side in columns.
- No line inside a code block is longer than 72 characters.
- The drawing uses only names the person already knows or that the sentence above it explains. Internal labels such as question numbers ("Q3"), invariant ids ("I-5") or story numbers do not appear inside a drawing.

A question with no drawing at all passes when it is a name or a yes-or-no question.

FAIL if any Escalation or Challenge with options breaks one of these, or if the reply has no Escalation or Challenge with options.
