# Design it twice

Produce rival interfaces for one module and pick between them. Run it only after the person has chosen the module and asked to explore its interface. Uses the words in [`SKILL.md`](SKILL.md) and the strategies in [`DEEPENING.md`](DEEPENING.md).

## 1. Brief the person

Tell the person, in a few lines, what every rival will have to satisfy: the callers it must serve, what it reaches outside the process and which strategy that implies, and a throwaway code fragment that makes those demands concrete. Then go straight to step 2 without waiting; they read while the rivals are drafted.

## 2. Draft the rivals

Draft three or more, each under its own brief:

- **Fewest entry points**: the smallest number of calls that still serves every caller.
- **The busiest caller's wish**: the interface the most frequent call site would write if it could choose.
- **I/O at the edge**: every outside dependency arrives as a port, and the core is pure.
- **Most code deleted**: the design that lets the most existing code, callers included, disappear.

When the harness can run helper agents in parallel, give each brief to its own helper, together with the files involved, what the module reaches, and the words from `SKILL.md` and the project's glossary. Otherwise draft them yourself, one at a time, each from its own brief, without bending an earlier one to match a later one.

Every rival shows its interface (calls, types, preconditions, order of calls, failures), one caller using it, what it hides, and its adapters.

## 3. Choose

Lay the rivals out one at a time, then set them side by side on three questions: how much does a caller have to learn, where would the next change land, and where does the seam fall? End with one pick and the reason for it, or a named blend of two when that is better than either. The person wants a decision to react to.
