# Depth check

The four questions asked of every module a pull request adds or whose interface it changes. Assumes the vocabulary in [SKILL.md](SKILL.md): **module**, **interface**, **depth**, **seam**, **adapter**, **leverage**, **locality**, and its principles (the deletion test, "the interface is the test surface", "one adapter means a hypothetical seam, two a real one"). One file, three readers: the slice gate (`review-pr`), the `depth` persona at the main gate (`review-panel`), and the survey (`improve-pr-architecture`). Each applies it as its own section below says; the questions never change.

## Reading rule

**A diff cannot show depth.** Depth is a property of the interface, and a diff shows fragments of interfaces. So the check reads wider than a diff, and bounded:

- **In scope**: every module the PR **adds**, and every module whose **interface it changes** (a new or changed signature, export, route, event, invariant, error mode). Lines changed inside an unchanged interface stay out of scope; the diff and its context lines are enough there. The survey widens scope to every touched module; the gates do not.
- **For each module in scope, read**: the module whole (interface and implementation), its direct callers, and the tests that exercise it. Then stop. Touched modules and their direct callers, never the codebase.

## The four questions

Ask each of every module in scope. A "no" is an answer; zero fired checks is a valid result.

1. **Introduced shallowness.** Did the PR add a module whose interface is nearly as complex as its implementation, or a seam with one adapter and nothing varying across it? Apply the deletion test: would deleting the new module concentrate complexity back where it belongs, or was it earning its keep?
2. **Extracted for testability.** Did it pull pure functions out so they could be unit-tested, while the bugs live in how they are called? Tests with no locality pass while the call site is wrong.
3. **Touched an already-shallow module.** Was the module shallow before this PR? Pre-existing shallowness counts only where the PR touches it, and there it is the cheap moment: the author is already in the file and tests are being written.
4. **Tests past the interface.** Do the PR's tests cross the interface, or assert on internals and mock the code under test? A test that would break under an internal refactor is testing past the interface.

Every fired check carries: the files (module and callers), the problem in the vocabulary, the deepening (what goes behind which interface, in a line or two: a direction, not a design), the payoff (locality or leverage gained; which tests get simpler or disappear), and a **Timing** call:

- `This PR`: the deepening lives inside the files the PR already rewrites, and the PR's own tests become the tests at the new interface.
- `Follow-up`: real, but it spreads past the PR's files or would change the PR's scope.
- `Leave it`: pre-existing and cheap to live with, or an ADR settles it.

An ADR conflict is named only when the friction is real enough to reopen the ADR.

## In the survey

`improve-pr-architecture` adds a **Strength** call (`Strong`, `Worth exploring`, `Speculative`) and reports every fired check, `Leave it` included, as a **deepening opportunity**: an idea, never a verdict.

## At a gate

`review-pr` and the `depth` persona report a fired check as an ordinary finding, category `depth`, under the gate's own confidence rule (name the line and the failure, at least 80% sure).

| Fired | Timing | Severity |
| --- | --- | --- |
| Question 1, 2 or 4 (the PR introduced it) | `This PR` | **Important** |
| Question 1, 2 or 4 | `Follow-up` | **Minor** |
| Question 3 (already shallow, touched here) | any | **Minor** |
| any | `Leave it` | not a finding |

Never Critical. The finding anchors to the line that declares the interface (the export, class, function or route signature), and the failure it names is concrete: what callers must know to use how little, which bug the tests cannot see, or which refactor the tests would not survive. A question-3 finding carries `pre_existing: false`: the PR's contribution is the missed cheap moment, not the shallowness. The fix line names the direction from the Timing call; the gate never designs the module.
