---
name: prototype
description: Builds a throwaway prototype on its own branch to answer one design question, either a logic prototype (one page driving a pure module) or UI variants on one route behind a switcher. Use when someone needs to try a state model, data shape or API before committing to it, wants to see several ways a screen could look, or when another skill needs something rough to react to.
---

A prototype is code written to be thrown away, and its only product is an answer. Build the least that gets the person a verdict, on a branch that never merges.

## 1. State the question

Write the question as one sentence the prototype can answer, such as "Can a booking be cancelled after it is refunded, and what does the rider see?" or "Which of three layouts makes the dashboard's top task fastest?". Show it in the prototype itself (a visible intro, not a code comment), so a reader who opens it cold knows what to judge.

Pick the shape from the question:

| The question is about | Shape | Read |
| --- | --- | --- |
| What happens: states, transitions, data shape, an API's feel | Logic prototype | [`LOGIC.md`](LOGIC.md) |
| What it looks like: layout, hierarchy, which control comes first | UI variants | [`UI.md`](UI.md) |

When the person cannot be asked and the question fits both, let the code around it decide (server-side modules lean logic, pages and components lean UI) and write that assumption into the intro.

Done when the question is written in the prototype's intro and the shape is chosen.

## 2. Cut the throwaway branch

Create the branch `prototype/<slug>` from the current one and do all of the work there. The prototype lives beside the code it questions, so its context is plain, and it is named so nobody mistakes it for production: `prototype` in the file or route name.

Done when the current branch is the new one and the branch you left has no changes.

## 3. Build it rough

Read the file for the shape you chose, then build. These hold for both shapes:

- **One command to run.** A logic prototype opens by double-click, and a UI prototype starts from the project's usual dev command.
- **Memory only.** State lives in the running page. A question about persistence is the one reason to write anywhere, and then only to a scratch file or database named so that it can be wiped.
- **Rough on purpose.** Skip tests, skip error handling except what keeps it running, skip abstraction, and ignore the next feature.
- **State in plain view.** After every action, or every switch of variant, the page shows the full relevant state, so a change is something the person sees and not something they infer.

Done when the prototype runs from its one command and the intro shows the question.

## 4. Hand it over and take the verdict

Give the person the path or URL and how to move around in it, then wait. The useful reactions are the surprised ones ("that should not be possible", "I want B's header with C's sidebar"), because each marks a flaw in the idea itself. Extend the prototype when they ask for another action, scenario or variant.

Done when the person's verdict is in their own words and you can say which part of the question it settles.

## 5. Keep the answer, shelve the code

1. Record what was asked and what the person concluded, where the work will find it: a comment on the issue the prototype served, or the final commit message on the branch.
2. Push the branch and name it in that record. It is the primary source for the answer, and it is never merged and never opened as a pull request.
3. Carry only the validated decision into the real branch, rewritten under the project's normal standards with tests. The prototype's own code is not copied across, apart from a pure logic module once its behaviour has been pinned by tests.

Done when the record names the branch and the verdict, and the real branch holds nothing from the prototype that has no test.
