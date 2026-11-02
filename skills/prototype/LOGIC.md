# Logic prototype

A logic prototype is one HTML file that makes a rule tangible. You build it for questions the whiteboard cannot settle, where only pressing buttons shows whether the rule holds. Anyone can open it, including people who never read code, so its labels use the vocabulary of the people who will judge it.

Running example: the epic board shows each Sub-issue's latest note. The question is "when two workers post a note in the same second, which one does the board call latest?"

## Write the rule before the page

Put the rule in a `<script>` block as plain functions, and make the block usable with no page around it. For the example:

```js
// Notes carry { at, worker, text }. Returns the note the board should show.
function latestNote(notes) { /* the rule under test */ }
```

Choose the smallest shape that holds the rule:

1. A single function over plain data, when the answer depends only on its input (as `latestNote` does).
2. A reducer, `(state, event) => state`, once events accumulate and order matters.
3. A table of states and allowed transitions, when whether an event is allowed at a given point is itself what you are testing.
4. An object with a few methods, only when it must remember things between calls.

The module may not mention `document`, handlers or timers. The page calls the module and never the reverse. If this rule survives the verdict, the module moves into the real code, so keeping it clean costs little now and pays then.

Done when the module runs from a console with no page loaded.

## Build the page around it

Inline everything in one file, with no installs or build. Label every control in the domain's words ("Worker B posts", "Clock ticks to next second") instead of the module's.

A layout that works for the example:

```text
Question: which note is "latest" when two arrive in the same second?
-------------------------------------------------------------------
State          notes so far (worker, time, text), and the one the
               rule picks as latest, highlighted
Actions        [Worker A posts] [Worker B posts] [Next second] [Reset]
Walkthroughs   tabs: "Same-second tie" | "Out-of-order arrival" | "Empty list"
               each tab: setup in a sentence, then its steps as buttons
```

Three habits make it trustworthy:

- Redraw the whole state after every click and mark what changed.
- Keep every action enabled. When the rule refuses one, show the refusal rather than disabling the button.
- Start each walkthrough tab from a fixed state, so it plays identically every time.

The sketch has three tabs because each is a case nobody settles by thinking about it: two notes stamped with the same second, a note that arrives after a newer one, and a Sub-issue with no notes, where `latestNote` has to show that nothing is latest.

Done when each walkthrough runs from a fresh load and each action visibly changes the state panel.

## When the person sees the wrong thing

Three ways the latest-note page goes wrong, each visible to whoever is clicking it:

- **The same-second tab picks a different winner after a reload.** `latestNote` read the clock instead of each note's `at`, so the walkthrough no longer starts from a fixed state. Pass time in as data.
- **A tab asks whether a closed worker's notes should show at all.** The page now poses a second question, and the verdict blurs the two. Take it out and offer it as its own prototype.
- **The note list shows today's real workers.** The page fetched a live Epic, so the tie may never occur and the person reacts to whatever happened this morning. Seed the notes each tab needs in the page.
