---
"mattpocock-skills": patch
---

`setup-syn54x-skills` finds a legacy `CONTEXT.md` / `CONTEXT-MAP.md` left from before the 1.3.0 rename and offers to `git mv` it to its `GLOSSARY` name and rewrite those names in `docs/agents/domain.md`, so a repo set up on 1.2.x gets back to one glossary by re-running setup. The `domain-modeling` docs page's naming question, which a find-and-replace had turned into "`GLOSSARY.md` and not `GLOSSARY.md`", now explains the rename and the re-run. Ported from upstream mattpocock/skills#1176 (draft PR #1228).
