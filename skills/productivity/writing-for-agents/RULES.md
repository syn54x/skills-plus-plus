# Rules an agent obeys while working

A **rule** here is a line the agent applies mid-task: an `AGENTS.md` invariant, a `CLAUDE.md` law. It is a step's completion criterion turned standing, so it takes the same shape:

1. **Trigger**: the moment it applies.
2. **Check**: the observable state that discharges it.
3. **Incident**: the event that named it, last.

A rule told as a story has no moment to fire at.

- Before: "Last sprint two copies of the retry predicate drifted apart; keep one."
- After: "The moment a predicate is about to appear in a second file, move it to a shared module in that same PR; the check is one definition, imported everywhere. (Two copies of the retry predicate drifted apart.)"
