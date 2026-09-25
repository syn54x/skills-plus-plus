# Scaffold Python Project: Templates

Substitute placeholders:

- `<pypi-name>`: kebab-case PyPI name
- `<module_name>`: snake_case import package
- `<description>`: one-line description
- `<python_version>`: e.g. `3.13`
- `<author_name>`, `<author_email>`
- `<cli_script>`: console script name (often matches module or short name)
- `<github_owner>`, `<github_repo>`, `<pypi-package-name>`: release workflow placeholders

## Templates index

| Template | Anchor |
|----------|--------|
| pyproject.toml | [#tmpl-pyproject](#tmpl-pyproject) |
| prek.toml | [#tmpl-prek](#tmpl-prek) |
| zensical.toml | [#tmpl-zensical](#tmpl-zensical) |
| justfile | [#tmpl-justfile](#tmpl-justfile) |
| CHANGELOG.md | [#tmpl-changelog](#tmpl-changelog) |
| src layout | [#tmpl-src-layout](#tmpl-src-layout) |
| settings.py | [#tmpl-settings](#tmpl-settings) |
| observability.py | [#tmpl-observability](#tmpl-observability) |
| cli/app.py | [#tmpl-cli](#tmpl-cli) |
| api/app.py | [#tmpl-api](#tmpl-api) |
| storage/db.py | [#tmpl-storage-db](#tmpl-storage-db) |
| storage/models | [#tmpl-storage-models](#tmpl-storage-models) |
| tests/conftest.py | [#tmpl-conftest](#tmpl-conftest) |
| tests/test_health.py | [#tmpl-test-health](#tmpl-test-health) |
| ci.yml | [#tmpl-ci](#tmpl-ci) |
| docs.yml | [#tmpl-docs-workflow](#tmpl-docs-workflow) |
| release.yml | [#tmpl-release](#tmpl-release) |
| docs/pages/index.md | [#tmpl-docs-index](#tmpl-docs-index) |
| docs/pages/getting-started/installation.md | [#tmpl-docs-install](#tmpl-docs-install) |

---

<a id="tmpl-pyproject"></a>

## pyproject.toml (library / CLI baseline)

```toml
[project]
name = "<pypi-name>"
version = "0.1.0"
description = "<description>"
readme = "README.md"
authors = [{ name = "<author_name>", email = "<author_email>" }]
requires-python = ">=<python_version>"
dependencies = [
    "pydantic>=2.0",
    "pydantic-settings>=2.0",
    "structlog>=24",
]

[project.scripts]
# CLI only: remove if no CLI
<cli_script> = "<module_name>.cli.app:app"

[build-system]
requires = ["uv_build>=0.11.16,<0.12.0"]
build-backend = "uv_build"

[tool.uv.build-backend]
module-name = "<module_name>"

[tool.uv]
default-groups = ["dev"]

[dependency-groups]
dev = [
    "prek>=0.4",
    "ruff>=0.11",
    "ty>=0.0.1a0",
    "pytest>=8",
    "pytest-cov>=6",
    "pytest-asyncio>=1.0",
    "commitizen>=4",
    # Docs feature: omit when docs disabled:
    "zensical>=0.0.45",
    "mkdocstrings-python>=1.16",
    "pymdown-extensions>=10.7",
]

[tool.ruff]
target-version = "py<python_version>"
line-length = 100
src = ["src", "tests"]

[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B", "SIM", "RUF", "TC", "PTH"]

[tool.ty.environment]
python-version = "<python_version>"

[tool.ty.src]
include = ["src"]

[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["src"]
asyncio_mode = "auto"
asyncio_default_fixture_loop_scope = "function"
addopts = ["--cov=<module_name>", "--cov-report=term-missing"]

[tool.commitizen]
name = "cz_conventional_commits"
tag_format = "v$version"
version_scheme = "pep440"
major_version_zero = true
version_provider = "uv"
update_changelog_on_bump = true
changelog_file = "CHANGELOG.md"
```

### Conditional dependency blocks

Append to `[project].dependencies` as needed:

```toml
# CLI
"cyclopts>=4",

# REST API: pick one
"fastapi>=0.111",
"uvicorn[standard]>=0.29",
# "litestar[standard]>=2",

# AI
"pydantic-ai>=2,<3",

# Database
"ferro-orm[alembic]>=0.14,<0.15",

# Telemetry
"logfire>=4,<5",
```

Add matching packages to `dev` when needed:

```toml
# Database (SQLite tests)
"aiosqlite>=0.22",

# REST API tests
"httpx>=0.27",
```

`pytest-asyncio` is already in the baseline (always).

---

<a id="tmpl-prek"></a>

## prek.toml

```toml
[[repos]]
repo = "https://github.com/pre-commit/pre-commit-hooks"
rev = "v5.0.0"
hooks = [
  { id = "trailing-whitespace" },
  { id = "end-of-file-fixer" },
  { id = "check-yaml" },
  { id = "check-toml" },
  { id = "check-merge-conflict" },
  { id = "mixed-line-ending", args = ["--fix=lf"] },
]

[[repos]]
repo = "local"
hooks = [
  { id = "ruff-check", name = "ruff check", entry = "uv run ruff check --fix .", language = "system", pass_filenames = false, always_run = true },
  { id = "ruff-format", name = "ruff format", entry = "uv run ruff format .", language = "system", pass_filenames = false, always_run = true },
  { id = "ty-check", name = "ty check", entry = "uv run ty check src", language = "system", pass_filenames = false, always_run = true },
  # Docs feature delta: include only when docs enabled:
  # { id = "zensical-build", name = "zensical build", entry = "uv run zensical build --clean", language = "system", pass_filenames = false, always_run = true },
]

[[repos]]
repo = "https://github.com/commitizen-tools/commitizen"
rev = "v4.8.3"
hooks = [
  { id = "commitizen", stages = ["commit-msg"] },
]
```

CLI projects: add a `cli-docs` local hook pointing at `scripts/gen_cli_docs.py`.

---

<a id="tmpl-zensical"></a>

## zensical.toml (minimal)

```toml
[project]
site_name = "<pypi-name>"
site_description = "<description>"
docs_dir = "docs/pages"
site_dir = "site"
watch = ["src", "README.md"]

nav = [
  { "Home" = "index.md" },
  { "Getting started" = [
    { "Installation" = "getting-started/installation.md" },
  ] },
]

[project.plugins.mkdocstrings.handlers.python]
paths = ["src"]

[project.plugins.mkdocstrings.handlers.python.options]
docstring_style = "google"
show_source = true
show_root_heading = true

[project.markdown_extensions.admonition]
[project.markdown_extensions.tables]
[project.markdown_extensions.toc]
permalink = true

[project.markdown_extensions.pymdownx.highlight]
anchor_linenums = true

[project.markdown_extensions.pymdownx.superfences]
```

---

<a id="tmpl-justfile"></a>

## justfile

```just
set dotenv-load := true

default:
    @just --list

setup:
    uv sync
    uv run prek install
    uv run prek install --hook-type commit-msg

check:
    uv run ruff check .
    uv run ruff format --check .
    uv run ty check src

fix:
    uv run ruff check --fix src tests
    uv run ruff format src tests

test *args:
    uv run pytest {{args}}

docs-serve:
    uv run zensical serve

docs-deploy:
    gh workflow run docs.yml --ref main

release-smoke:
    rm -rf dist/
    uv build
    uv run --with dist/*.whl --no-project -- python -c "import <module_name>; print(<module_name>.__version__)"

release:
    #!/usr/bin/env bash
    set -euo pipefail
    branch="$(git rev-parse --abbrev-ref HEAD)"
    if [[ "${branch}" != "main" ]]; then
      echo "error: checkout main before releasing (on ${branch})" >&2
      exit 1
    fi
    if [[ -n "$(git status --porcelain)" ]]; then
      echo "error: uncommitted changes; commit or stash before releasing" >&2
      exit 1
    fi
    git fetch origin main
    if [[ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]]; then
      echo "error: main is not synced with origin/main; push or pull first" >&2
      exit 1
    fi
    uv run prek run --all-files
    just release-smoke
    gh workflow run release.yml --ref main
    echo "Triggered Release workflow on main."
    echo "Watch: gh run watch --workflow release.yml"
```

---

<a id="tmpl-changelog"></a>

## CHANGELOG.md (stub)

```markdown
# Changelog

All notable changes to this project will be documented in this file.

This file is generated by [commitizen](https://github.com/commitizen-tools/commitizen) at release time.
```

---

<a id="tmpl-src-layout"></a>

## src layout

```
.
├── src/<module_name>/
│   ├── __init__.py          # __version__ = "0.1.0"
│   ├── settings.py          # always
│   ├── observability.py     # always (structlog facade; Logfire optional)
│   ├── cli/
│   │   ├── __init__.py
│   │   └── app.py           # if CLI
│   ├── storage/             # if database (ferro-orm)
│   │   ├── db.py
│   │   └── models/
│   │       └── __init__.py  # import all models (metadata registration)
│   └── api/
│       ├── __init__.py
│       └── app.py           # if REST
├── tests/
│   ├── conftest.py
│   └── test_health.py
├── AGENTS.md
├── docs/
│   ├── agents/
│   │   └── design.md        # general software design baseline
│   │                        # issue-tracker.md / domain.md / triage-labels.md
│   │                        # come from /setup-syn54x-skills (step 9), not here
│   └── pages/
│       ├── index.md
│       └── getting-started/installation.md
├── scripts/                 # if CLI docs generator
├── .github/workflows/
│   ├── ci.yml
│   ├── docs.yml
│   └── release.yml
├── .python-version
├── .gitignore
├── CHANGELOG.md
├── README.md
├── justfile
├── prek.toml
├── pyproject.toml
└── zensical.toml
```

---

<a id="tmpl-settings"></a>

## settings.py

```python
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="<MODULE>_", env_file=".env", extra="ignore")

    debug: bool = False
    log_level: str = "INFO"


settings = Settings()
```

---

<a id="tmpl-observability"></a>

## observability.py (always: structlog facade; optional Logfire)

Scaffold this module on every project. Callers use `configure_observability` / `get_logger` only; never import `structlog` or `logfire` directly.

Baseline (no Logfire):

```python
from __future__ import annotations

import logging

import structlog

_CONFIGURED = False


def configure_observability(*, service_name: str, verbose: bool = False) -> None:
    global _CONFIGURED
    if _CONFIGURED:
        return

    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(level=level, format="%(message)s")

    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(level),
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )
    _CONFIGURED = True


def get_logger(name: str | None = None) -> structlog.stdlib.BoundLogger:
    return structlog.get_logger(name)
```

When Logfire is enabled, expand the same module: configure logfire first, structlog second, then re-export `span = logfire.span` so callers still only import from this facade.

---

<a id="tmpl-cli"></a>

## cli/app.py (cyclopts)

```python
from cyclopts import App

from <module_name> import __version__

app = App(
    name="<cli_script>",
    help="<description>",
    version=__version__,
    version_flags=["--version", "-V"],
)


@app.default
def main() -> None:
    """Default command."""
    print("Hello from <cli_script>")


if __name__ == "__main__":
    app()
```

`pyproject.toml` entry (required convention): `<cli_script> = "<module_name>.cli.app:app"`.

---

<a id="tmpl-api"></a>

## api/app.py (FastAPI)

```python
from fastapi import FastAPI

from <module_name>.observability import configure_observability

configure_observability(service_name="<pypi-name>")

app = FastAPI(title="<pypi-name>", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
```

Litestar variant:

```python
from litestar import Litestar, get

from <module_name>.observability import configure_observability

configure_observability(service_name="<pypi-name>")


@get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


app = Litestar(route_handlers=[health])
```

---

<a id="tmpl-storage-db"></a>

## storage/db.py (ferro-orm)

Ferro is async. Use `connect(..., migrate_updates=True)` for schema bootstrap (or Alembic for migration history). Import all models before `connect` so metadata registers.

```python
"""Database lifecycle. One global Ferro engine per process."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from ferro import connect, engines, reset_engine

import <module_name>.storage.models  # noqa: F401: register metadata before connect
from <module_name>.settings import Settings, settings

_initialized = False


async def init_db(cfg: Settings | None = None) -> None:
    global _initialized
    if _initialized:
        return
    db = cfg or settings
    await connect(db.db_dsn, migrate_updates=True)
    _initialized = True


async def close_db() -> None:
    global _initialized
    if not _initialized:
        return
    reset_engine()
    _initialized = False


@asynccontextmanager
async def db_lifespan(cfg: Settings | None = None) -> AsyncIterator[None]:
    await init_db(cfg)
    try:
        async with engines.session():
            yield
    finally:
        await close_db()
```

Extend `settings.py` with a DSN property:

```python
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="<MODULE>_", env_file=".env", extra="ignore")

    db_path: Path = Path("data/app.db")

    @property
    def db_dsn(self) -> str:
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        return f"sqlite:///{self.db_path}"


settings = Settings()
```

---

<a id="tmpl-storage-models"></a>

## storage/models/example.py (ferro-orm)

Use `Annotated` + `FerroField` for column options. Lambda predicates for queries (see ferro docs).

```python
from typing import Annotated

from ferro import FerroField
from ferro.models import Model


class Item(Model):
    id: Annotated[int | None, FerroField(primary_key=True)] = None
    name: str
```

`storage/models/__init__.py`: import every model so Ferro sees them:

```python
from <module_name>.storage.models.example import Item

__all__ = ["Item"]
```

---

<a id="tmpl-conftest"></a>

## tests/conftest.py (ferro-orm)

```python
from collections.abc import AsyncIterator
from pathlib import Path

import pytest

from <module_name>.settings import Settings
from <module_name>.storage.db import close_db, db_lifespan


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    return Settings(db_path=tmp_path / "test.db")


@pytest.fixture
async def db(settings: Settings) -> AsyncIterator[Settings]:
    await close_db()
    async with db_lifespan(settings):
        yield settings
    await close_db()
```

`asyncio_mode = "auto"` is already in the baseline pytest config.

---

<a id="tmpl-test-health"></a>

## tests/test_health.py

```python
def test_import():
    import <module_name>  # noqa: F401


def test_version():
    from <module_name> import __version__

    assert __version__
```

---

<a id="tmpl-ci"></a>

## .github/workflows/ci.yml

PRs and pushes to `main`. Lint via prek; test via pytest matrix.

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: astral-sh/setup-uv@v6
        with:
          python-version: "<python_version>"
          enable-cache: true

      - name: Install dependencies
        run: uv sync --frozen --all-groups

      - name: Prepare prek hooks
        run: uv run prek install --prepare-hooks

      - name: Run prek on all files
        run: uv run prek run --all-files

  test:
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, macos-latest]
        python: ["<python_version>", "<python_version_next>"]  # e.g. 3.13, 3.14
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4

      - uses: astral-sh/setup-uv@v6
        with:
          python-version: ${{ matrix.python }}
          enable-cache: true

      - name: Install dependencies
        run: uv sync --frozen --all-groups

      - name: Run tests
        run: uv run pytest

  pr-title:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: amannn/action-semantic-pull-request@v5
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Use a single Python version in the test matrix when the project pins one version only.

---

<a id="tmpl-docs-workflow"></a>

## .github/workflows/docs.yml

Standalone docs deploy, **not** part of CI. Callable from `release.yml`.

```yaml
name: Docs

on:
  workflow_dispatch:
    inputs:
      ref:
        description: Git ref to build and deploy (branch, tag, or SHA)
        type: string
        default: main
  workflow_call:
    inputs:
      ref:
        description: Git ref to build and deploy (branch, tag, or SHA)
        type: string
        default: main

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v5
        with:
          ref: ${{ inputs.ref }}
          fetch-depth: 0

      - uses: astral-sh/setup-uv@v6
        with:
          python-version: "<python_version>"
          enable-cache: true

      - name: Install dependencies
        run: uv sync --frozen --all-groups

      - name: Build documentation
        run: uv run zensical build --clean

      - uses: actions/upload-pages-artifact@v3
        with:
          path: site

      - id: deployment
        uses: actions/deploy-pages@v4
```

---

<a id="tmpl-release"></a>

## .github/workflows/release.yml

Triggered by `just release` → `gh workflow run release.yml`. Runs prek + pytest gate, then commitizen bump, PyPI publish, GitHub Release, and docs deploy.

Substitute `<github_owner>`, `<github_repo>`, `<pypi-package-name>`.

```yaml
name: Release

on:
  workflow_dispatch:
    inputs:
      publish_only:
        description: Skip cz bump; publish current version on main (failed-publish recovery)
        type: boolean
        default: false

permissions:
  contents: write
  id-token: write

concurrency:
  group: release
  cancel-in-progress: false

jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - uses: astral-sh/setup-uv@v6
        with:
          python-version: "<python_version>"
          enable-cache: true

      - name: Install dependencies
        run: uv sync --frozen --all-groups

      - name: Prepare prek hooks
        run: uv run prek install --prepare-hooks

      - name: Run prek on all files
        run: uv run prek run --all-files

      - name: Run tests
        run: uv run pytest

  release:
    needs: gate
    runs-on: ubuntu-latest
    outputs:
      tag: ${{ steps.tag.outputs.tag }}
    steps:
      - name: Verify release app is configured
        run: |
          if [ -z "${{ vars.RELEASE_APP_ID }}" ]; then
            echo "::error::RELEASE_APP_ID is not set. Add the GitHub App ID as an org or repo variable."
            exit 1
          fi
          if [ -z "${{ secrets.RELEASE_APP_PRIVATE_KEY }}" ]; then
            echo "::error::RELEASE_APP_PRIVATE_KEY is not available."
            exit 1
          fi

      - uses: actions/create-github-app-token@v1
        id: app-token
        with:
          app-id: ${{ vars.RELEASE_APP_ID }}
          private-key: ${{ secrets.RELEASE_APP_PRIVATE_KEY }}
          owner: <github_owner>
          repositories: <github_repo>

      - uses: actions/checkout@v5
        with:
          fetch-depth: 0
          token: ${{ steps.app-token.outputs.token }}

      - uses: astral-sh/setup-uv@v6
        with:
          python-version: "<python_version>"
          enable-cache: true

      - name: Install dependencies
        run: uv sync --frozen --all-groups

      - name: Configure git
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

      - name: Bump version and changelog
        if: ${{ !inputs.publish_only }}
        run: uv run cz bump --yes --check-consistency --changelog --changelog-to-stdout > release-body.md

      - name: Prepare release body (publish-only recovery)
        if: ${{ inputs.publish_only }}
        run: |
          python3 - <<'EOF'
          import re
          import sys
          from pathlib import Path

          version = re.search(
              r'^version = "([^"]+)"',
              Path("pyproject.toml").read_text(),
              re.MULTILINE,
          )
          if not version:
              sys.exit("missing [project].version in pyproject.toml")
          version = version.group(1)
          changelog = Path("CHANGELOG.md").read_text()
          match = re.search(
              rf"^## v{re.escape(version)} \(.*?\)\n(?P<body>(?:\n(?!## ).*)*)",
              changelog,
              re.MULTILINE,
          )
          if not match:
              sys.exit(f"no CHANGELOG section for v{version}")
          Path("release-body.md").write_text(match.group("body").strip() + "\n")
          EOF

      - name: Verify release body
        run: test -s release-body.md

      - name: Push release commit and tag
        if: ${{ !inputs.publish_only }}
        run: |
          TAG=$(git describe --tags --abbrev=0 --match 'v*')
          git push origin main
          git push origin "${TAG}"

      - id: tag
        run: echo "tag=$(git describe --tags --abbrev=0 --match 'v*')" >> "$GITHUB_OUTPUT"

      - name: Build package
        run: uv build

      - uses: actions/upload-artifact@v4
        with:
          name: release-dist
          path: dist/

      - uses: actions/upload-artifact@v4
        with:
          name: release-body
          path: release-body.md

  publish:
    needs: release
    runs-on: ubuntu-latest
    environment:
      name: pypi
      url: https://pypi.org/p/<pypi-package-name>
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: release-dist
          path: dist/

      - name: Publish to PyPI
        uses: pypa/gh-action-pypi-publish@release/v1

  github-release:
    needs: [release, publish]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/create-github-app-token@v1
        id: app-token
        with:
          app-id: ${{ vars.RELEASE_APP_ID }}
          private-key: ${{ secrets.RELEASE_APP_PRIVATE_KEY }}
          owner: <github_owner>
          repositories: <github_repo>

      - uses: actions/download-artifact@v4
        with:
          name: release-dist
          path: dist/

      - uses: actions/download-artifact@v4
        with:
          name: release-body
          path: .

      - name: Create GitHub Release
        env:
          GH_TOKEN: ${{ steps.app-token.outputs.token }}
        run: |
          gh release create "${{ needs.release.outputs.tag }}" \
            --repo "${{ github.repository }}" \
            --title "${{ needs.release.outputs.tag }}" \
            --notes-file release-body.md \
            --verify-tag \
            dist/*.tar.gz dist/*.whl

  docs:
    needs: release
    uses: ./.github/workflows/docs.yml
    with:
      ref: main
    permissions:
      contents: read
      pages: write
      id-token: write
```

### Release setup checklist

After scaffolding, configure in GitHub:

1. **Pages**: Settings → Pages → Source: GitHub Actions
2. **PyPI**: Trusted publisher for `release.yml` on environment `pypi`
3. **GitHub App**: `RELEASE_APP_ID` variable + `RELEASE_APP_PRIVATE_KEY` secret (contents write on target repo)
4. **Environments**: `github-pages`, `pypi`

---

<a id="tmpl-docs-index"></a>

## docs/pages/index.md

```markdown
# <pypi-name>

<description>

## Development

```bash
uv sync
uv run prek install
just check
prek run --all-files
```
```

---

<a id="tmpl-docs-install"></a>

## docs/pages/getting-started/installation.md

```markdown
# Installation

```bash
uv tool install <pypi-name>   # CLI tools
# or
uv add <pypi-name>            # as a dependency
```

## From source

```bash
git clone <repo-url>
cd <pypi-name>
uv sync
```
```
