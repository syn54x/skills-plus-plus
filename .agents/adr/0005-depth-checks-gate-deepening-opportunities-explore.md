# Depth checks gate; deepening opportunities explore

In 1.x, depth observations were kept out of the review gates on the theory that they were judgement calls that should never block a merge. An epic's retro showed the cost: seven deepening candidates turned up in a survey after the fact, none at the slice gate, two at the panel as Minor, and four shipped later as refactor pull requests. We reversed that, and 2.0 keeps the reversal.

The four questions of the **Depth check** (did the change introduce shallowness, extract a module only to test it, touch an already shallow module, or test past the interface) run at both gates and produce ordinary findings in a `depth` category. `improve-architecture` asks the same four questions over the whole repo or one pull request, and stays the place where a **Deepening opportunity** is explored and turned into a glossary term, an ADR or an issue.

## Decisions

- **One copy.** `codebase-design` owns the four questions, the reading rule and the severity mapping. `review`, the panel's `depth` persona and `improve-architecture` reach them by calling that skill; nothing is pasted.
- **Severity.** Important when the pull request introduced the shallowness and the fix stays inside files it already rewrites. Minor when the module was already shallow or the fix spreads past the pull request's files. Never Critical. A shallow spot that is old and cheap to live with, or settled by an ADR, is not a gate finding; the survey still lists it. The 80% confidence rule applies.
- **Reading rule.** A reviewer reads the diff, with one exception for this check: a module the pull request adds or whose interface it changes is read whole, with its direct callers and its tests.
- **At the main gate** the `depth` persona is the only depth reader, so the same modules are not read twice. Its Minor findings flow to `close-epic`'s learnings, where follow-ups are filed in one place.

## Consequences

A slice review may read a few whole modules; a fix that changes no interface costs nothing extra. The panel runs one more persona per Epic.
