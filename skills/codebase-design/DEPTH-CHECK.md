# Depth check

The single home of the four questions a review asks about the shape of modules a pull request creates or reshapes. Three readers use it: the slice gate in `review`, the main gate's `depth` Persona, and the survey in `improve-architecture`. It uses the words in [`SKILL.md`](SKILL.md).

## The four questions

Put all four to every module in scope (below). A module that triggers none is a normal outcome.

1. **Introduced shallowness.** Does a module born in this pull request make callers learn almost as much as it does for them, or put a seam where only one adapter exists? Picture it inlined into its callers.
2. **Extracted for testability.** Was logic split into small functions so they could get unit tests of their own, while the risk sits in how those functions are wired together? Such tests stay green while the wiring is wrong.
3. **Touched an already shallow module.** Did the module have this problem before the pull request arrived? Older shallowness counts only where the pull request is already working: the author has the file and its tests open, and the fix will never be cheaper.
4. **Tests past the interface.** Do the new tests inspect internals or mock the very code they claim to test? If a refactor that keeps the interface would break a test, that test is aimed past it.

## Scope and reading

A diff shows fragments of an interface, while depth belongs to the whole of one, so this check reads more than the diff, up to a fixed limit.

- **In scope**: a module the pull request creates, or one whose interface it alters (a signature, an export, a route, an event, a guarantee, a failure mode). Edits behind an unchanged interface stay out; the diff covers them. The survey also takes in every module the pull request touches; the gates stay narrower.
- **What to read**: every in-scope module in full, the code that calls it directly, and its tests. Nothing beyond.

## Writing up a question that fires

Give the files (the module and its callers), the problem in the words of `SKILL.md`, the direction of the fix (what moves behind which interface, a sentence at most, never a full design), what it buys (which callers simplify, which tests shrink or go), and a **Timing**:

| Timing | When |
| --- | --- |
| `This PR` | The fix stays inside files the pull request already rewrites, and its own tests become the tests of the new interface. |
| `Follow-up` | The fix is real but reaches past those files or would change what the pull request is for. |
| `Leave it` | The shallowness is old and costs little, or an ADR chose it. |

## At a gate

At the slice gate, and for the `depth` Persona, every question that fires becomes a finding in the `depth` category, under the gate's confidence rule (a named line and a named failure, at least 80% sure). Severity follows from the question and the Timing:

| Question | `This PR` | `Follow-up` | `Leave it` |
| --- | --- | --- | --- |
| 1, 2 or 4 | Important | Minor | not reported |
| 3 | Minor | Minor | not reported |

No finding in the depth category is ever Critical. Pin it to the line where the interface is declared, whether that is an exported name, a route or a class header, and name a failure someone can verify: how much callers learn for how little, a defect the tests are blind to, or a refactor that would break them. A finding from question 3 is not marked pre-existing, because what the pull request adds is the missed chance. The fix line points in the direction the Timing gives and leaves the design to the author.

## In a survey

`improve-architecture` lists every fired question, `Leave it` included, as a **Deepening opportunity** for the person to explore, never as a verdict.
