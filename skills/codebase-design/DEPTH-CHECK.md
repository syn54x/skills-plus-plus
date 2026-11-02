# Depth check

Four questions asked of every module a pull request adds or whose interface it changes. This file is their one copy: the slice gate in `review`, the `depth` Persona at the main gate and the survey in `improve-architecture` all read it here. It uses the vocabulary in [`SKILL.md`](SKILL.md).

## Reading rule

A diff shows pieces of interfaces, and depth is a property of the whole interface, so this check reads past the diff, within a fixed bound.

- **In scope**: every module the pull request adds, and every module whose interface it changes (a signature, an export, a route, an event, an invariant or an error mode, added or altered). A change inside an interface that stays the same is out of scope; the diff is enough there. The survey widens scope to every module the pull request touches; the gates do not.
- **Read, for each module in scope**: the module whole, its direct callers, and the tests that exercise it. Nothing further.

## The four questions

Ask all four of every module in scope. "No" is an answer, and a check that fires on nothing is a valid result.

1. **Introduced shallowness.** Did the pull request add a module whose interface is nearly as large as its implementation, or a seam with one adapter and nothing varying across it? Run the deletion test on it.
2. **Extracted for testability.** Did it pull logic out into small functions so they could be unit-tested, while the bugs live in how they are called? Those tests pass while the call site is wrong.
3. **Touched an already shallow module.** Was the module shallow before this pull request? Old shallowness counts only where the pull request touches it, because that is the cheap moment to fix it: the author is in the file and writing tests anyway.
4. **Tests past the interface.** Do the pull request's tests assert on internals or mock the code under test? A test that would break under a refactor that keeps the interface is testing past it.

Each question that fires is written up with:

- the module and its callers, as files;
- the problem, in the vocabulary;
- the deepening: what moves behind which interface, in a line or two (a direction, not a design);
- the payoff: the leverage or locality gained, and which tests become simpler or disappear;
- a **Timing**:
  - `This PR`: the deepening stays inside files the pull request already rewrites, and its own tests become the tests at the new interface.
  - `Follow-up`: real, but it reaches past the pull request's files or would change its scope.
  - `Leave it`: old and cheap to live with, or settled by an ADR.

## At a gate

The slice gate and the `depth` Persona report a fired question as an ordinary finding in the `depth` category, under the gate's confidence rule (the line and the failure named, at least 80% sure).

| Question | Timing | Severity |
| --- | --- | --- |
| 1, 2 or 4 | `This PR` | Important |
| 1, 2 or 4 | `Follow-up` | Minor |
| 3 | `This PR` or `Follow-up` | Minor |
| any | `Leave it` | no finding |

A depth finding is never Critical. It anchors on the line that declares the interface (the export, the class, the function or the route), and it names a concrete failure: how much callers must learn for how little, which bug the tests cannot see, or which refactor the tests would not survive. A question 3 finding is not marked pre-existing, since what the pull request contributed is the missed cheap moment. The fix names the direction from the Timing; the gate never designs the module.

## In a survey

`improve-architecture` reports every fired question, `Leave it` included, as a **Deepening opportunity**: an idea for the person to explore, never a verdict.
