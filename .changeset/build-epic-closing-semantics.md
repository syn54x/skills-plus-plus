---
"mattpocock-skills": patch
---

build-epic, close-epic: fix what closes what in the SDD pipeline. GitHub honours `Closes #N` only on a PR into the default branch, so build-epic now closes each sub-issue after its gated merge into the integration branch when it is still open, instead of assuming the merge did. The integration PR to `main` writes `Closes #<epic>` for the epic in its own repo and never a closing keyword for an epic in another repo. close-epic keys on the `<!-- sdd-summary -->` marker rather than the epic's state, so it runs against an epic the merge already closed and closes only an epic that is still open. implement-issue and review-pr say what the `Closes #N` line does.
