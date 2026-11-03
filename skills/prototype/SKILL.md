---
name: prototype
description: Build a throwaway prototype that answers one design question. Use when the user wants to try a state model, data shape or API before committing, or see several ways a screen could look.
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

   To tell them apart, ask what the person will argue about. Shown two same-second notes, they argue about which one wins, and the argument is the same however the row is drawn: logic. Shown a row, they argue about what catches the eye first, and the argument is the same whichever note won: UI. A question that starts both arguments is two questions. Build the one the person cares about now and name the other in the intro as left for later.
3. **Branch first.** Create `prototype/<slug>` from the current branch before writing a line, and keep every change there. Put the prototype beside the code it questions and put `prototype` in its file or route name. It writes nothing unless storage is the question (where `spp` keeps notes, say), and then only to a scratch file or database whose name says it can be wiped. Polish waits for the real code: write no tests and no abstractions, and catch an error only where the page would otherwise stop running.

Done when the intro states the question, the shape is chosen, and the branch you left is untouched.

## Show it and listen

Hand over something the person can open in one move: the logic page's file path, or the project's usual dev command plus the URL with `?variant=`. Add a line on how to move around, and wait. The most useful reactions are objections to the idea itself, such as "two notes in one second should never both be latest", or a blend such as "the note from option B in option C's row". Add the action, scenario or variant a reaction asks for; a prototype is meant to grow under feedback.

Done when you hold the person's verdict in their words and can say which part of the question it answers.

## Close out

1. Record the question and the verdict in a comment on the issue the prototype served, or in the branch's last commit message.
2. Push the branch and name it in that record. It is the evidence behind the verdict. It never merges and never gets a pull request.
3. On the real branch, implement only the decision, under the project's normal standards and with tests. The one prototype artefact that may cross over is a pure logic module, after tests have pinned its behaviour.

Done when the record names the branch and the verdict, and nothing from the prototype sits on the real branch without a test.
