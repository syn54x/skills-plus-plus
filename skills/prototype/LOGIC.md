# Logic prototype

One HTML page that lets a person push a state model through real cases by clicking. It suits questions about transitions, data shape or an API's feel: models that read fine on paper and only feel wrong once someone presses the buttons. Because it is a single file with nothing to install, it can go to a designer, a product owner or a domain expert, so it speaks their language and not the code's.

For a question about appearance, use [`UI.md`](UI.md).

## The module comes first

Write the logic as a small pure module in one `<script>` block, before any page exists. It answers the question, and it is the one part worth keeping. Choose its form by what the question asks:

| The question asks | Form |
| --- | --- |
| What a sequence of events does to a value | A reducer, `(state, event) => state` |
| Which events are legal right now | An explicit machine: states and the transitions between them |
| How one data shape converts into another | A few pure functions over plain data |
| How something with long-lived internal state behaves | A module with a small method surface |

Pick the form the question needs, not the form that is quickest to hook to the page. The module never touches `document` or a handler. The page calls it, and nothing calls back the other way, which is what lets the validated module move into the real code unchanged.

Done when the module runs in a console with no page loaded.

## The page

Plain HTML, CSS and JavaScript, all inline, with no frameworks, build step or server. Write every label in the domain's words ("Rider cancels", "Refund clears") and never the module's ("DISPATCH_CANCEL"). From the top of the page down:

1. The question, with one line saying what the page lets you explore.
2. The current state, as labelled fields rather than raw JSON, redrawn after every action, with what just changed called out.
3. One button for each action, always enabled, so anyone can try events in any order. An action the model forbids still has its button, and the page shows the refusal.
4. Scenarios, one per tab. A tab gives the setup and the thing to look for in a sentence or two, then lists its steps as buttons to press in order. Opening a tab resets to a known starting state, so a scenario plays the same each time.

Choose scenarios for the cases that are hard on paper: the ordinary path, an awkward interleaving, and an attempt at something that must be refused.

Style it plainly: readable type, room to breathe, one accent colour, no motion.

Done when each scenario runs end to end from a fresh load and every action's result shows in the state panel.

## What to leave out

- Tests. A prototype that needs them has stopped being one.
- A real database. Use memory unless persistence is the question.
- Generality. Handle the case in the question and no other.
- Page code inside the module. The first `document` reference makes the module impossible to lift out.
- A framework or dev server. The page should open by double-click.
- The page in production. Only the module behind it is worth carrying over.
