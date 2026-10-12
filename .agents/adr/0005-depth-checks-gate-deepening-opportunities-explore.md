# Depth checks gate; deepening opportunities explore

The changeset that added `improve-pr-architecture` said it was a skill rather than a `review-panel` persona because depth observations are judgement calls, not line-anchored findings, and must never gate a merge. One epic later, the retro (issue #22) showed what that costs: seven deepening candidates were found by a separate survey after the fact, none at the slice gate, two at the panel as Minor, and four shipped as refactor PRs. We reverse the premise. The four questions of the **Depth check** (introduced shallowness, extracted for testability, touched an already-shallow module, tests past the interface) run at both gates and produce ordinary findings, categorised `depth`; the `improve-` skills keep asking the same four questions and stay the place where a **Deepening opportunity** is explored, grilled, and turned into a glossary term or an ADR.

## Decisions

- **One copy.** `codebase-design/DEPTH-CHECK.md` owns the four questions, the reading rule, and the gate mapping below. `review-pr`, the `depth` persona in `review-panel`, and `improve-pr-architecture` all read it there; nothing is pasted. This breaks the Fowler-smell precedent of self-contained reviewer text, so `sdd-reviewer` preloads `codebase-design`.
- **Severity.** Important when the PR introduced the shallowness (questions 1, 2 or 4) and the deepening lives inside the files the PR already rewrites. Minor when the module was already shallow (question 3) or the fix spreads past the PR's files. Never Critical. The 80% confidence gate still applies, and the finding anchors to the line that declares the interface.
- **Reading rule.** "The diff is your view" holds, with one named carve-out: for the depth check only, a module the PR adds or whose interface it changes is read whole, with its direct callers and the tests that exercise it. Lines changed inside an unchanged interface get the diff-only treatment.
- **Question 3 and `pre_existing`.** A module the PR touched without deepening is reported at Minor with `pre_existing=false`; the PR's contribution is the missed cheap moment, not the shallowness.
- **Panel shape.** A sixth always-on persona, `depth`, skipped on prose-only diffs like `adversarial`. Its Minor findings join Candidate ADRs and terminology drift on the way to `close-epic`'s Learnings, so follow-ups are filed from one place instead of rediscovered.
- **`code-review`** is left alone for now; adding the check there is two lines once `DEPTH-CHECK.md` exists.

## Consequences

- Each slice review may load one more skill and read a few whole modules; a bug-fix PR that changes no interface costs what it did before.
- Each panel runs one more reviewer, once per epic.
- `improve-pr-architecture` survives as the exploring half: Timing and Strength cards, the posted report, the grilling loop. Its "`improve-` skills generate ideas; `review-` skills gate" line now reads: the gate flags, the survey explores.
