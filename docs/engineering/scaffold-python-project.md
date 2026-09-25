## What it does

`scaffold-python-project` bootstraps a new Python repo on one opinionated stack: `uv`, `prek`, `ruff`, `ty`, `pytest`, `zensical` docs, `pydantic` settings, `structlog` behind an observability facade, `ferro-orm` for persistence, and GitHub Actions for CI, docs deploy and tag-driven release. It asks a handful of questions, turns the answers into **feature flags**, and copies only the templates those flags select.

The stack is fixed on purpose. The skill never invents an alternative (no SQLAlchemy, no `mypy`, no hand-written `.gitignore`); every file comes from its template bag, so two repos scaffolded a month apart look the same.

## When to reach for it

Type `/scaffold-python-project`, or the agent reaches for it when you ask to create, bootstrap or scaffold a new Python project, package, library, CLI or API service.

| You want… | Flag it sets |
| --- | --- |
| A command-line tool | `cli` (cyclopts) |
| A REST API | `api` (FastAPI or Litestar) |
| A database | `database` (ferro-orm) |
| Tracing and structured logs shipped somewhere | `logfire` |
| A docs site | `docs` (zensical, deployed by its own workflow) |
| Publishing to PyPI | `pypi` |
| The syn54x engineering skills configured in the new repo | `syn54x-skills` |

For a React front end, use [scaffold-frontend-project](../engineering/scaffold-frontend-project.md).

## Prerequisites

`uv` and `curl` on your machine. It creates the project in a new directory.

## Common questions

**Why doesn't it run `/setup-syn54x-skills` for me?** That setup is user-invoked, so no skill can start it. With the `syn54x-skills` flag on, the scaffold finishes by telling you to run it in the new project; it writes `AGENTS.md` first so the setup has a file to edit.

## It's working if

- The baseline verify from the skill's feature matrix passes in the new repo, then each chosen flag's own check.
- Only the flags you chose have files: no `api/` folder in a library, no docs workflow without `docs`.
- `CLAUDE.md` does not exist; `AGENTS.md` does.

## Where it fits

`scaffold-python-project` is a **run-once setup** at the very start of a repo, before [setup-syn54x-skills](../engineering/setup-syn54x-skills.md). [ask-syn54x](../engineering/ask-syn54x.md) routes the whole set.
