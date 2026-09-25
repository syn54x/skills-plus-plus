---
name: scaffold-python-project
description: Scaffolds new Python projects with uv, prek, ruff, ty, pytest, zensical, GitHub Actions (CI, docs deploy, release), pydantic, structlog, ferro-orm for databases, and optional cyclopts CLI, FastAPI/Litestar REST API, Pydantic AI, and Logfire. Use when the user asks to create, bootstrap, or scaffold a new Python project, package, library, CLI tool, or API service, including when the new repo should be configured for the syn54x engineering skills.
---

# Scaffold Python Project

Opinionated Python project bootstrap. Reference implementations: https://github.com/syn54x/ttd, https://github.com/syn54x/ferro-orm, https://github.com/syn54x/mkdocs-typer2.

Templates live only in [REFERENCE.md](./REFERENCE.md). Agent guideline payloads: [AGENT-GUIDES.md](./AGENT-GUIDES.md). Apply the **feature matrix** below; do not invent alternate stacks.

## Discovery (ask before scaffolding)

Use `AskQuestion` when available; otherwise ask conversationally. Do not scaffold until answers are clear.

| Question | Options / notes |
|----------|-----------------|
| **Project kind** | `library` (PyPI package), `application` (deployable service), `cli-tool` (installable via `uv tool install`) |
| **Project name** | kebab-case for PyPI; derive `module_name` as snake_case |
| **Python version** | Default `>=3.13`; use `3.14` only when explicitly requested |
| **Target path** | New directory or existing empty directory |
| **CLI?** | → `cli` flag |
| **REST API?** | If yes → `fastapi` or `litestar` → `api` flag |
| **AI / agents?** | If yes → add `pydantic-ai>=2,<3` to deps only (no template yet) |
| **Database?** | → `database` flag (**ferro-orm** only) |
| **Logfire telemetry?** | → `logfire` flag (wires into always-scaffolded observability facade) |
| **Docs site?** | Default yes → `docs` flag |
| **PyPI publish?** | Default yes for library/CLI; no → `pypi` off (skip publish jobs) |
| **Commit lockfile?** | `uv.lock` in VCS for apps/CLI; optional for libraries (note in README) |
| **GitHub org/repo** | Needed for release workflow placeholders |
| **syn54x engineering skills?** | If yes → `syn54x-skills` flag (hand off to `/setup-syn54x-skills` after verify) |

Collect author name/email if not inferable from git config.

## Feature matrix

Copy selected rows. Paths and bodies come from [REFERENCE.md](./REFERENCE.md) (see its Templates index). `baseline` is always on.

| Flag | deps | files | prek Δ | workflows | verify |
|------|------|-------|--------|-----------|--------|
| **baseline** | `pydantic`, `pydantic-settings`, `structlog`; dev: `prek`, `ruff`, `ty`, `pytest`, `pytest-cov`, `pytest-asyncio`, `commitizen` | `pyproject.toml`, `prek.toml` (baseline hooks), `justfile`, `CHANGELOG.md`, `settings.py`, `observability.py` (structlog facade), `tests/test_health.py`, `AGENTS.md`, `docs/agents/design.md`, `.github/workflows/ci.yml`, `.github/workflows/release.yml` | pre-commit-hooks + ruff/format/ty + commitizen | `ci.yml`, `release.yml` | `just check && prek run --all-files && uv run pytest` |
| **cli** | `cyclopts>=4` | `cli/app.py`; `[project.scripts]` → `…cli.app:app` | optional `cli-docs` | none | `uv run <cli_script> --help` |
| **api** | FastAPI: `fastapi`, `uvicorn[standard]`; or Litestar: `litestar[standard]`; + `httpx` (dev) | `api/app.py` (pick FastAPI or Litestar template) | none | none | import app module (covered by smoke tests) |
| **database** | `ferro-orm[alembic]>=0.14,<0.15`; `aiosqlite` (dev) | `storage/db.py`, `storage/models/`, `tests/conftest.py` (`db` fixture); extend `settings.py` with DSN | none | none | `uv run pytest` exercises `db` fixture |
| **logfire** | `logfire>=4,<5` | expand `observability.py` facade (logfire first, then structlog; re-export `span`) | none | none | facade exports `get_logger`; no direct `logfire`/`structlog` imports outside it |
| **docs** | `zensical`, `mkdocstrings-python`, `pymdown-extensions` | `zensical.toml`, `docs/pages/index.md`, `docs/pages/getting-started/installation.md` | `zensical-build` | `docs.yml`; `release.yml` `docs` job | `uv run zensical build --clean` |
| **pypi** (default on) | none | release publish env URL | none | keep `publish` + `github-release` jobs | no unsubstituted `<github_owner>` / `<github_repo>` / `<pypi-package-name>` in workflows |

When **pypi** is off: omit `publish` / `github-release` from `release.yml` (and PyPI trusted-publisher setup).

## Scaffolding workflow

```
- [ ] 1. Discovery complete → selected matrix rows
- [ ] 2. uv init + src layout
- [ ] 3. .gitignore (GitHub Python.gitignore)
- [ ] 4. Apply matrix → copy templates from REFERENCE.md
- [ ] 5. Agent guidelines from AGENT-GUIDES.md (I-1 verbatim)
- [ ] 6. Substitute placeholders (`<github_owner>`, `<module_name>`, …)
- [ ] 7. uv sync && prek install && prek install --hook-type commit-msg
- [ ] 8. Verify = baseline verify ∪ selected feature smokes
- [ ] 9. Hand off to `/setup-syn54x-skills` (only if `syn54x-skills`)
```

### Step 2: uv init

```bash
cd <target-path>
uv init --name <pypi-name> --python <version>
```

| Kind | uv init flags | build backend |
|------|---------------|---------------|
| library | `--lib` or `--package` | `uv_build` (simple) or `hatchling` (entry points/plugins) |
| application | `--package` | `uv_build` |
| cli-tool | `--package` | `uv_build` + `[project.scripts]` |

Use **src layout**: `src/<module_name>/`. Pin `[tool.uv.build-backend] module-name = "<module_name>"` when using `uv_build`.

### Step 3: .gitignore

```bash
curl -fsSL https://raw.githubusercontent.com/github/gitignore/main/Python.gitignore -o .gitignore
```

Append project-specific lines after the fetch if needed (e.g. `.worktrees/`, `.cache/`).

### Step 4: Apply matrix

For each selected flag, copy the listed files from [REFERENCE.md](./REFERENCE.md). Do not restate template bodies here.

- **baseline** always includes settings + observability (structlog facade). Logfire only expands that facade.
- **CLI** entrypoint convention: `"<module_name>.cli.app:app"` only.
- **Database:** ferro-orm only: `connect(..., migrate_updates=True)`; register models via side-effect import before `connect`.
- Document release secrets / Pages / PyPI trusted publishing in the README (see reference release setup checklist).

### Step 5: Agent guidelines

Copy from [AGENT-GUIDES.md](./AGENT-GUIDES.md). Do not paraphrase the I-1 invariant. Substitute `<project-name>` in `docs/agents/design.md`.

Do not create `CLAUDE.md`. Do not pre-seed `docs/agents/issue-tracker.md`, `docs/agents/domain.md`, `docs/agents/triage-labels.md`, or `CONTEXT.md`; those belong to step 9 when `syn54x-skills` is on.

### Step 6: Placeholders

Substitute `<pypi-name>`, `<module_name>`, `<github_owner>`, `<github_repo>`, `<pypi-package-name>`, author fields, and related tokens everywhere copied from templates.

### Step 7: Install hooks

```bash
uv sync
uv run prek install
uv run prek install --hook-type commit-msg
```

### Step 8: Verify

Run baseline verify, then each selected feature's `verify` cell from the matrix.

### Step 9: syn54x engineering skills (`syn54x-skills` only)

Skip this step entirely when the user declined.

When `syn54x-skills` is on, after verify, tell the user to open the new project and run `/setup-syn54x-skills` there. It is user-invoked, so only they can start it: do not read its `SKILL.md` and follow it by hand, and do not pre-write its output. `AGENTS.md` already exists (step 5), so the setup will **edit** it (adding `## Agent skills`, and the SDD routing block if they turn the pipeline on) rather than create `CLAUDE.md`.

If the skills-plus-plus set is not installed, tell the user to install it first (`/plugin marketplace add syn54x/skills-plus-plus`, then `/plugin install skills-plus-plus@syn54x`), then run `/setup-syn54x-skills` in the new project.

## Anti-patterns

- Do not bump versions locally; use `just release` → release workflow
- Do not use SQLAlchemy, raw `sqlite3`, or another ORM for app persistence; use ferro-orm
- Do not combine docs deploy into `ci.yml`; keep `docs.yml` separate (docs flag)
- Do not omit pytest / pytest-asyncio from baseline dev dependencies
- Do not use `.pre-commit-config.yaml` when `prek.toml` suffices
- Do not put docs content at `docs/` root; use `docs/pages/`
- Do not use `mypy`; use `ty`
- Do not hand-write `.gitignore`; fetch GitHub Python.gitignore
- Do not import `structlog` or `logfire` outside the observability facade
- Do not skip `pydantic-settings` / `settings.py`; always scaffolded
- Do not skip `observability.py`; always scaffolded
- Do not point `[project.scripts]` at `:main`; use `:app`
- Do not run or reproduce `setup-syn54x-skills` yourself; it is user-invoked, so step 9 hands it to the user
- Do not skip the step-9 handoff when the user opted in
- Do not create `CLAUDE.md` during scaffold; `AGENTS.md` is the agent file `/setup-syn54x-skills` will edit

## Additional resources

- Templates: [REFERENCE.md](./REFERENCE.md)
- Agent guideline templates: [AGENT-GUIDES.md](./AGENT-GUIDES.md)
- Engineering-skill config: `/setup-syn54x-skills`, run by the user (step 9, `syn54x-skills` flag)
