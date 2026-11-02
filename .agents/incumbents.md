# Incumbent watchlist

The projects the weekly Incumbent watch follows, and what to read for each. Repo maintenance only: nothing here ships to users. [incumbent-watch.md](./incumbent-watch.md) is the procedure that uses it; `scripts/incumbent-delta.ts` reads the JSON block below.

Fields: `name` is the key in the watch issue's cursor, so renaming one resets its window to 90 days. `repo` is the GitHub `owner/name` (left out when `gh` has nothing to read). `releases` says whether to read the repository's releases. `changelog` is a path whose commits count as changelog entries. `read` names the specific skills, docs or pages the routine opens when a new item touches them.

Every `repo` was confirmed with `gh repo view` on 2026-11-01. Two names differ from how people say them: ECC lives at `affaan-m/ECC`, and gsd-core at `open-gsd/gsd-core`. Cursor is unconfirmed: its repository holds only an issue tracker, so `gh` has no releases or changelog to read, and the routine opens the changelog page by hand.

```json
[
  { "name": "mattpocock/skills", "repo": "mattpocock/skills", "releases": true, "changelog": "CHANGELOG.md", "read": ["skills/"] },
  { "name": "Superpowers", "repo": "obra/superpowers", "releases": true, "changelog": "RELEASE-NOTES.md", "read": ["skills/"] },
  { "name": "Compound Engineering", "repo": "EveryInc/compound-engineering-plugin", "releases": true, "changelog": "CHANGELOG.md", "read": ["README.md"] },
  { "name": "ECC", "repo": "affaan-m/ECC", "releases": true, "changelog": "CHANGELOG.md", "read": ["README.md"] },
  { "name": "Spec Kit", "repo": "github/spec-kit", "releases": true, "changelog": "CHANGELOG.md", "read": ["spec-driven.md"] },
  { "name": "OpenSpec", "repo": "Fission-AI/OpenSpec", "releases": true, "changelog": "CHANGELOG.md", "read": ["docs/"] },
  { "name": "cc-sdd", "repo": "gotalab/cc-sdd", "releases": true, "changelog": "CHANGELOG.md", "read": ["README.md"] },
  { "name": "BMAD", "repo": "bmad-code-org/BMAD-METHOD", "releases": true, "changelog": "CHANGELOG.md", "read": ["docs/"] },
  { "name": "gsd-core", "repo": "open-gsd/gsd-core", "releases": true, "changelog": "CHANGELOG.md", "read": ["README.md"] },
  { "name": "ponytail", "repo": "DietrichGebert/ponytail", "releases": true, "read": ["README.md"] },
  { "name": "Claude Code", "repo": "anthropics/claude-code", "releases": true, "changelog": "CHANGELOG.md", "read": ["https://code.claude.com/docs/en/plugins"] },
  { "name": "Codex", "repo": "openai/codex", "releases": true, "changelog": "CHANGELOG.md", "read": ["https://developers.openai.com/codex"] },
  { "name": "Cursor", "releases": false, "read": ["https://cursor.com/changelog"] }
]
```
