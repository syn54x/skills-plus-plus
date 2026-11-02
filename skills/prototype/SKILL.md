---
name: prototype
description: Builds a throwaway prototype on its own branch to answer one design question, either a logic prototype (one page driving a pure module) or UI variants on one route behind a switcher. Use when someone needs to try a state model, data shape or API before committing to it, wants to see several ways a screen could look, or when another skill needs something rough to react to.
---

A prototype is the cheapest thing that can be wrong in an informative way. It exists to produce a verdict from a person, and the code is the means of getting one. Everything about it is built to be discarded, and nothing about it is allowed onto the branch the real work lives on.

Both shapes below share one running example, taken from `spp`'s own epic board. Logic question: when two workers post a note in the same second, which one does the board show as the latest? UI question: how should one Sub-issue row arrange its state, its latest note and its worker?

## Frame it

1. **Write the question.** One sentence, answerable by someone watching the prototype, and shown in the prototype's own intro rather than in a code comment. A reader who opens it cold must be able to tell what they are judging.
2. **Choose the shape by what the question is about.**

   | If the question is about | Build | Details |
   | --- | --- | --- |
   | Behaviour: which state follows which event, what a data shape can express | A logic prototype | [`LOGIC.md`](LOGIC.md) |
   | Appearance: arrangement, emphasis, what leads | UI variants | [`UI.md`](UI.md) |

   When the question straddles both and nobody can be asked, let the code around it break the tie (server-side modules lean logic, pages lean UI) and record that assumption in the intro.
3. **Branch first.** Create `prototype/<slug>` from the current branch before writing a line, and keep every change there. Put the prototype beside the code it questions and put `prototype` in its file or route name.

Done when the intro states the question, the shape is chosen, and the branch you left is untouched.

## Hold the line on effort

The prototype gets only what the verdict needs:

- It starts from one command: a double-click for a logic page, the project's usual dev command for UI variants.
- Its data sits in the running page. Writing anywhere is justified only when storage is itself the question, and then the target is a scratch file or database whose name says it can be wiped.
- It carries no tests and no abstractions, and its error handling stops at whatever keeps it running.
- It shows the whole relevant state after every action or variant switch, so the person sees a change instead of inferring it.

If you catch yourself adding any of the things this list omits, you are building the feature. Stop and return to the question.

## Show it and listen

Hand over the path or URL with a line on how to move around, and wait. The most useful reactions are objections to the idea itself, such as "two notes in one second should never both be latest", or a blend such as "the note from option B in option C's row". Add the action, scenario or variant a reaction asks for; a prototype is meant to grow under feedback.

Done when you hold the person's verdict in their words and can say which part of the question it answers.

## Close out

1. Record the question and the verdict in a comment on the issue the prototype served, or in the branch's last commit message.
2. Push the branch and name it in that record. It is the evidence behind the verdict. It never merges and never gets a pull request.
3. On the real branch, implement only the decision, under the project's normal standards and with tests. The one prototype artefact that may cross over is a pure logic module, after tests have pinned its behaviour.

Done when the record names the branch and the verdict, and nothing from the prototype sits on the real branch without a test.
