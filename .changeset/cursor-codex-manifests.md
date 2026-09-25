---
"mattpocock-skills": minor
---

Cursor and Codex manifests. `.cursor-plugin/plugin.json` lists the promoted skills explicitly, because Cursor does not discover `skills/<bucket>/<name>/` from a single `./skills/` path (verified with `cursor-agent --plugin-dir`), and ships the `sdd-worker` and `sdd-reviewer` agents plus `hooks/cursor.json` (hooks unverified). `.codex-plugin/plugin.json` and `.agents/plugins/marketplace.json` are included but unverified. `sdd-worker`'s description is no longer invalid YAML, which made Cursor drop the agent; `scripts/check-invocation.py` now rejects unquoted `: ` or ` #` in frontmatter values. `scripts/sync-plugin-version.mjs` keeps every manifest's version in step with `package.json`.
