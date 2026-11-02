# Output formats

What each scope hands the person. Name code with codebase-design's words and the domain with the repo glossary's nouns.

## Repo scope: a page in the scratch directory

The repo survey ends as one HTML file, `architecture-<YYYYMMDD-HHMM>.html`, in the session's scratch directory (the OS temp directory when the harness offers none). Keep it out of the repo. Open it for the person if the harness can, and print its absolute path in any case.

The page has three parts, in this order.

### 1. The ranking

A table, one row per opportunity, highest Strength first and, within a Strength, most churn first:

| Column | Holds |
| --- | --- |
| Module | Its name in glossary nouns, linked to its section below |
| Fired | The Depth check question numbers that fired |
| Churn | Commits in the survey window that touched the module's files |
| Callers | How many places call it |
| Strength | `Strong`, `Worth exploring` or `Speculative` |

A person who reads only this table knows where to look first.

### 2. One section per opportunity

Each section answers four questions in prose of a sentence or two, then shows one drawing.

- **What does a caller have to know today?** List the names, call orders and failure cases one real caller handles.
- **What would it have to know after?** The same caller, against the deeper interface you have in mind. A direction, not a design.
- **Where does a change land?** The files the last few commits to this area had to touch together, against where the same change would land after.
- **What happens to the tests?** Which tests keep working through the new interface, and which become redundant.

Add a line naming an ADR only when this opportunity would reopen it, with the reason the friction outweighs the decision.

**The drawing** is drawn from one caller's side. Put that caller on the left. On the right, draw every name it must reach to get its job done: in the current state, a fan of lines to each module, function or flag it touches; in the proposed state, the same caller with its lines collapsed onto one interface, and the parts it no longer sees greyed inside. When the friction is about changes rather than calls, draw a change footprint instead: a row per recent commit, a cell per file, shaded where the commit touched it, so files that always change together show up as a band.

Draw with inline SVG and plain CSS, with no external scripts. Use the page's text colour for lines and one highlight colour for what the caller must learn, and define both for light and dark schemes so the page reads in either.

### 3. Checked, nothing fired

A list of the modules in scope that the survey read and found no opportunity in. It shows the person how far the survey reached, and keeps them from assuming an unlisted module was never looked at.

## Pull request scope: a comment-ready summary

Write it in Markdown, shown in the conversation and, after the person says yes, posted as one comment on the pull request:

```markdown
### Depth survey of #<number>: <title>

`<base7>..<head7>`, <M> modules read, <K> deepening opportunities.

| # | Module | Question fired | Timing | Strength |
| --- | --- | --- | --- | --- |
| 1 | `<module>` | 2, extracted for testability | `Follow-up` | `Worth exploring` |

**1. `<module>`.** <What its callers must learn now, in a sentence. What would move behind which interface, in a sentence. Which of this pull request's tests that would change.> Callers: `<file>`, `<file>`. <A sentence naming an ADR, only when one would reopen.>

Read with nothing fired: `<module>`, `<module>`.

<sub>Suggestions for the author to weigh, from `/improve-architecture`. They are not a review.</sub>
```

With no opportunities, leave out the table and the numbered paragraphs; the counts line and the "Read with nothing fired" line carry the whole result. To post, save the text in the session's scratch directory and run `gh pr comment "$N" --body-file <file>`.
