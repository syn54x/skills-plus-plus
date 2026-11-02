# Output formats

How `improve-architecture` shows its opportunities, one section per scope. Both use codebase-design's words for the shape of code (module, interface, implementation, depth, deep, shallow, seam, adapter, leverage, locality) and the repo glossary's nouns for the domain: "the Order intake module", never the class name and never "the Order service".

## Repo scope: the visual report

Write one self-contained HTML file named `architecture-<YYYYMMDD-HHMM>.html` to the session's scratch directory, or to the OS temp directory when the harness gives none. It never goes in the repo. Open it for the person when the harness can open files, and give its absolute path either way.

### Page

1. A header: the repo name, the date, and a legend for the marks the drawings use (a plain box is a module, a dashed line a seam, a red arrow a leak across a seam, a heavy dark box a deep module).
2. One card per opportunity, strongest first.
3. A closing panel naming the opportunity to start with, one sentence on why, and a link to its card.

### Card

Each card is an `<article>` holding, in this order:

- a title naming the deepening in glossary nouns ("Fold the Order intake checks into one module");
- a Strength badge: green for `Strong`, amber for `Worth exploring`, grey for `Speculative`;
- the files, in a monospaced list;
- the before and after drawings, side by side, which carry the card;
- **Problem** and **Direction**, one sentence each;
- **Payoff**, as short bullets that name the gain in codebase-design terms ("locality: pricing faults land in one module", "one interface, five callers"). "Cleaner" and "easier to maintain" name nothing; leave them out;
- an amber line naming the ADR, only when the card reopens one.

A drawing that needs a paragraph to explain it is the wrong drawing; redraw it.

### Drawings

Choose the drawing that shows the problem, and vary them across the report:

| Drawing | Fits | Before | After |
| --- | --- | --- | --- |
| Dependency graph | Calls that bounce between many small modules | Boxes and arrows, leaks in red | One heavy box, its callers outside |
| Layer stack | A call passing through layers that add nothing | Thin horizontal bands | One thick band naming the job |
| Interface and implementation bars | A module that exposes almost as much as it hides | Two bars of almost equal height | A short interface bar over a tall implementation bar |
| Call-tree fold | Logic split into pieces only so each could be tested | Nested boxes, one per function | One box, the old pieces faded inside it |

Build the drawings from inline SVG and CSS. Load a diagram library from a CDN only when a graph's layout is too tangled to place by hand; the page runs no other script. Keep each drawing about 300px tall so both drawings sit next to each other on one screen. Use one accent colour, red only for leaks and amber only for ADR lines, and set label text small and uppercase so drawings read as schematics.

## Pull request scope: report cards

Show the cards in the conversation in this shape:

```markdown
## Deepening opportunities in <pull request title> (`<base7>..<head7>`)

Ideas for the author, not a verdict. Nothing here holds the merge.

### 1. <the deepening, in glossary nouns>
- **Files:** `<module>`, `<module>` (called from `<caller>`)
- **Problem:** <the Depth check question that fired, in codebase-design words>
- **Direction:** <the module now, one line> becomes <the module after, one line>
- **Payoff:** <leverage or locality gained; tests that shrink or go>
- **Timing:** `This PR` | `Follow-up` | `Leave it`, then why, in a line
- **Strength:** `Strong` | `Worth exploring` | `Speculative`
- **ADR:** <omit unless the card reopens one; then name it and why the friction justifies that>

## Where to start
<one opportunity and why, or "none: the pull request neither creates a shallow module nor edits one">
```

To post it after a yes, write the same text to a file in the session's scratch directory and run `gh pr comment "$N" --body-file <file>`.
