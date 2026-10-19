---
"mattpocock-skills": minor
---

New model-invoked `productivity` skill `writing-for-humans`: the editorial rules for prose a person reads (release notes, PR bodies, docs pages, docstrings, issue and summary comments), as a "before you write" checklist and 24 rules in three groups, each with its reason, plus a sibling `EVIDENCE.md` holding every rule's sources and quotes. A repo's own `AGENTS.md` or `CLAUDE.md` writing rules take precedence. `prepare-release-notes` loads it in place of its Voice bullets and now puts a headline's emoji first; `pr`, `implement-issue` (when the ticket touches a docs page or docstring) and `close-epic` (before the summary comment) load it at their drafting step, and `.agents/writing-docs.md` defers to it for prose (#31).
