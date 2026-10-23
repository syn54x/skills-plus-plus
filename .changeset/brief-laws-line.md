---
"mattpocock-skills": minor
---

`build-epic` stops paraphrasing a law list the worker reads anyway. Section 0 reads each repo's Laws line once (the `Laws:` line of the `<!-- sdd-routing -->` block, or the fallback list), alongside the plan comment and the epic body. The worker brief's Laws section now names the Laws line's sources (or the fallback), the epic decisions that bind the slice, and anything the orchestrator would otherwise review for, instead of restating the rules. The brief's other sections are unchanged, and the `build-epic` docs page is re-synced.
