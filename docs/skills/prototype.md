## What it does

`prototype` builds a rough, disposable version of something to answer one question: does this state model hold up, or which of these layouts works. It states the question before it builds anything, since a polished prototype of the wrong question teaches nothing.

The code is thrown away, but the answer is not. The prototype lives on its own `prototype/<slug>` branch, which is never merged, and only the decision it settled is carried into the real branch, rewritten with tests.

## When to reach for it

Type `/prototype`, or let the agent start it when a task fits. Use it when a question stays open however long you talk: transitions you cannot keep straight in your head, or a screen you cannot judge until three versions sit side by side. [wayfinder](wayfinder.md) can also put a prototype ticket on its map, which you settle with this skill.

| Your situation | Use |
| --- | --- |
| A design question that talking has not settled | `prototype` |
| A question that a document or an API can answer | [research](research.md) |
| Something already built is misbehaving | [diagnosing-bugs](diagnosing-bugs.md) |
| A plan that needs challenging, not trying | [grill](grill.md) |

`prototype` sits on the planning side of the Epic path, and inside unknown territory as one of wayfinder's four ticket types. `ask-spp` routes between every skill when the right one is unclear.

## Two shapes

The question picks the shape.

| You are asking | You get |
| --- | --- |
| What happens when events arrive in this order | A single HTML page that drives a small pure module. It shows the state in labelled fields, a button for every action, and one tab per scenario to walk through. |
| What should this look like | Three to five structurally different variants on one route, switched with a bar at the bottom of the screen and a `?variant=` parameter in the URL. |

The logic page opens by double-click and speaks the domain's words, so a designer or a domain expert can drive it without help. The UI variants sit inside the real page, among its real data, since any variant looks fine on a bare route.

## Common questions

**Does the prototype get deleted?**
No. Delete it and the next reader has only a summary of what you saw. It stays on its `prototype/<slug>` branch as the evidence for the answer, and the record of the verdict names that branch. What never happens is a merge.

**Can I turn the prototype into the real thing?**
Carry the decision across, not the code. The one exception is a pure logic module, once tests pin its behaviour. The rest was written with no tests and no error handling, so it is rewritten under the project's normal standards.

**An agent suggested a prototype when I knew what to build.**
A prototype answers a question that is still open. When the design is settled, go to implementation. When one choice is unsettled, prototype only that choice.

## It's working if

Look at what is left after a prototype session and you should find:

- A pushed `prototype/<slug>` branch with no pull request against it, and an untouched branch you started from.
- A question in the prototype's own intro, which you can read without opening any code.
- A comment on the issue, or a final commit message, that gives the question, the person's verdict and the branch name.
- No write to a database, file or service outside a scratch location the prototype named as wipeable. Reads are fine: UI variants render live data.
- On the real branch afterwards, only the decision, written with tests. Nothing from `prototype/` is there.
