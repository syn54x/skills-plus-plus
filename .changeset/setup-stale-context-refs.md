---
"mattpocock-skills": patch
---

`setup-syn54x-skills` now repairs stale `CONTEXT.md` / `CONTEXT-MAP.md` references in `docs/agents/domain.md` and the `## Agent skills` block even when no legacy file exists on disk. Before, the rewrite was offered only when a legacy file was found, so a repo whose glossary had not been created yet kept the old names.
