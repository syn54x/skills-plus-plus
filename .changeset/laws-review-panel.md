---
"mattpocock-skills": minor
---

`review-panel` collects its laws from the same place the worker and the slice gate do. Its first step reads the `Laws:` line of the `<!-- sdd-routing -->` block in `CLAUDE.md` or `AGENTS.md` and writes the paths that exist to `laws.txt`, listing a directory whole; when the line is absent it falls back to the one list shared with `implement-issue` and `review-pr`. The personas, `PANEL-DISPATCH.md` and the findings schema are unchanged, so the main gate now judges the diff against exactly the documents that bound the work.
