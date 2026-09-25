# Scaffold Frontend Project: Templates

Substitute placeholders:

- `<project-name>`: kebab-case package name
- `<description>`: one-line description
- `<github_owner>`, `<github_repo>`: release / cliff link placeholders

## Templates index

| Template | Anchor |
|----------|--------|
| src layout | [#tmpl-src-layout](#tmpl-src-layout) |
| package.json scripts | [#tmpl-package-scripts](#tmpl-package-scripts) |
| biome.json | [#tmpl-biome](#tmpl-biome) |
| prek.toml | [#tmpl-prek](#tmpl-prek) |
| justfile | [#tmpl-justfile](#tmpl-justfile) |
| vite.config.ts | [#tmpl-vite](#tmpl-vite) |
| tsconfigs | [#tmpl-tsconfig](#tmpl-tsconfig) |
| vitest.config.ts | [#tmpl-vitest](#tmpl-vitest) |
| vitest.setup.ts | [#tmpl-vitest-setup](#tmpl-vitest-setup) |
| index.html | [#tmpl-index-html](#tmpl-index-html) |
| src/main.tsx | [#tmpl-main](#tmpl-main) |
| src/vite-env.d.ts | [#tmpl-vite-env](#tmpl-vite-env) |
| src/lib/app-version.ts | [#tmpl-app-version](#tmpl-app-version) |
| src/components/fields/field-mode.ts | [#tmpl-field-mode](#tmpl-field-mode) |
| src/routes/\_\_root.tsx | [#tmpl-root-route](#tmpl-root-route) |
| src/routes/index.tsx | [#tmpl-index-route](#tmpl-index-route) |
| field-mode tests | [#tmpl-field-mode-test](#tmpl-field-mode-test) |
| gitignore append | [#tmpl-gitignore-append](#tmpl-gitignore-append) |
| cliff.toml | [#tmpl-cliff](#tmpl-cliff) |
| ci.yml | [#tmpl-ci](#tmpl-ci) |
| release.yml | [#tmpl-release](#tmpl-release) |
| dependabot.yml | [#tmpl-dependabot](#tmpl-dependabot) |
| README stub | [#tmpl-readme](#tmpl-readme) |
| playwright.config.ts | [#tmpl-playwright](#tmpl-playwright) |
| e2e/home.spec.ts | [#tmpl-e2e-home](#tmpl-e2e-home) |
| openapi-ts.config.ts | [#tmpl-openapi-ts](#tmpl-openapi-ts) |
| src/api/client.ts | [#tmpl-api-client](#tmpl-api-client) |

---

<a id="tmpl-src-layout"></a>

## src layout

```
.
├── src/
│   ├── main.tsx
│   ├── index.css                 # from shadcn init: do not replace with brand CSS
│   ├── vite-env.d.ts
│   ├── routeTree.gen.ts          # generated; commit; never hand-edit
│   ├── routes/
│   │   ├── __root.tsx
│   │   └── index.tsx
│   ├── components/
│   │   ├── ui/                   # shadcn: add via CLI
│   │   └── fields/
│   │       ├── field-mode.ts
│   │       └── field-mode.test.ts
│   ├── lib/
│   │   ├── utils.ts              # cn() from shadcn
│   │   └── app-version.ts
│   ├── api/                      # api flag
│   │   ├── client.ts
│   │   └── generated/            # never hand-edit
│   └── hooks/
├── e2e/                          # e2e flag
│   └── home.spec.ts
├── docs/agents/design.md
├── .github/workflows/
│   ├── ci.yml
│   └── release.yml
├── AGENTS.md
├── README.md
├── biome.json
├── cliff.toml
├── components.json               # from shadcn
├── justfile
├── openapi-ts.config.ts          # api flag
├── openapi.json                  # api flag: committed snapshot
├── package.json
├── playwright.config.ts          # e2e flag
├── pnpm-lock.yaml
├── prek.toml
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
├── vitest.config.ts
└── vitest.setup.ts
```

---

<a id="tmpl-package-scripts"></a>

## package.json scripts + deps

Keep `"private": true`, `"version": "0.0.0"`, `"type": "module"`. Merge these scripts (drop oxlint/eslint):

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "biome check .",
    "preview": "vite preview",
    "fix": "biome check --write .",
    "test": "vitest run",
    "e2e": "playwright test"
  }
}
```

Omit `"e2e"` when the e2e flag is off.

Always add (do not invent alternatives):

```bash
pnpm add @tanstack/react-query
pnpm add -D \
  @biomejs/biome \
  @tanstack/router-plugin \
  vitest \
  @testing-library/react \
  @testing-library/jest-dom \
  jsdom \
  @types/node \
  typescript
```

create-tsrouter-app already adds Router, React, Vite, Tailwind, shadcn. Do not pin exact versions in this skill; take current ranges from the generator, then add the packages above if missing.

e2e flag:

```bash
pnpm add -D @playwright/test
pnpm exec playwright install --with-deps chromium
```

api flag:

```bash
pnpm add -D @hey-api/openapi-ts
```

---

<a id="tmpl-biome"></a>

## biome.json

```json
{
  "$schema": "https://biomejs.dev/schemas/2.5.4/schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "files": {
    "includes": [
      "**",
      "!src/routeTree.gen.ts",
      "!src/api/generated",
      "!public",
      "!test-results",
      "!playwright-report",
      "!.claude",
      "!.cursor",
      "!.tanstack"
    ]
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2
  },
  "javascript": {
    "formatter": { "quoteStyle": "single", "semicolons": "asNeeded" }
  },
  "linter": {
    "enabled": true,
    "rules": { "preset": "recommended" }
  },
  "assist": {
    "enabled": true,
    "actions": { "source": { "organizeImports": "on" } }
  }
}
```

Drop `!src/api/generated` when the api flag is off.

---

<a id="tmpl-prek"></a>

## prek.toml

```toml
# Commit-time hooks. `just setup` installs them (`prek install`).
#
# This is a fast local echo of what CI already gates, not a second source of
# truth: `just check` remains the authority.

default_install_hook_types = ["pre-commit", "commit-msg"]

[[repos]]
repo = "https://github.com/pre-commit/pre-commit-hooks"
rev = "v5.0.0"
hooks = [
  { id = "trailing-whitespace", exclude = "^(openapi\\.json|src/api/generated/|public/)" },
  { id = "end-of-file-fixer", exclude = "^(openapi\\.json|src/api/generated/|public/)" },
  { id = "mixed-line-ending", args = ["--fix=lf"], exclude = "^(openapi\\.json|src/api/generated/|public/)" },
  { id = "check-yaml" },
  { id = "check-json", exclude = "^tsconfig(\\..*)?\\.json$" },
  { id = "check-merge-conflict" },
  { id = "check-added-large-files", args = ["--maxkb=1024"] },
]

[[repos]]
repo = "local"
hooks = [
  { id = "biome", name = "biome check", entry = "pnpm exec biome check --write --no-errors-on-unmatched", language = "system", pass_filenames = true, types_or = ["ts", "tsx", "javascript", "jsx", "json"] },
  { id = "tsc", name = "tsc", entry = "pnpm exec tsc -b", language = "system", pass_filenames = false, always_run = true },
]

[[repos]]
repo = "https://github.com/commitizen-tools/commitizen"
rev = "v4.8.3"
hooks = [
  { id = "commitizen", stages = ["commit-msg"] },
]
```

When the api flag is off, drop `openapi.json|src/api/generated/` from the excludes (keep `public/`).

`tsconfig*.json` is JSONC: `check-json` rejects comments, so it stays excluded; `tsc -b` is what validates them.

---

<a id="tmpl-justfile"></a>

## justfile

```just
default:
    @just --list

# Install dependencies + commit hooks (prek: `brew install prek`).
setup:
    pnpm install
    @if command -v prek >/dev/null; then prek install; else echo "note: prek not found; brew install prek, then rerun just setup"; fi

dev:
    pnpm dev

# Lint + format check + typecheck.
check:
    pnpm exec biome check .
    pnpm exec tsc -b

fix:
    pnpm exec biome check --write .

test *args:
    pnpm exec vitest run {{ args }}

e2e *args:
    pnpm exec playwright test {{ args }}

# api flag: re-export the backend OpenAPI schema and regenerate the client.
# The committed openapi.json snapshot is the contract seam: API changes
# surface here as reviewable diffs, and CI fails on drift.
openapi-sync backend="../<project-name>-backend":
    just -f {{ backend }}/justfile -d {{ backend }} openapi {{ justfile_directory() }}/openapi.json
    pnpm exec openapi-ts

check-drift:
    pnpm exec openapi-ts
    git add -N src/api/generated
    git diff --exit-code src/api/generated

# Trigger a tag-driven release (see .github/workflows/release.yml).
release notes="":
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
    git fetch origin main --tags
    if [[ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]]; then
      echo "error: main is not synced with origin/main; push or pull first" >&2
      exit 1
    fi
    just check
    pnpm test
    pnpm build
    echo "next version: $(just next-version)"
    notes={{quote(notes)}}
    gh workflow run release.yml --ref main -f notes="${notes}"
    echo "Triggered Release workflow on main."
    echo "Watch: gh run watch --workflow release.yml"

changelog:
    uvx git-cliff --unreleased --tag "$(uvx git-cliff --bumped-version)" --strip header

next-version:
    @uvx git-cliff --bumped-version 2>/dev/null
```

Omit `e2e`, `openapi-sync`, and `check-drift` recipes when their flags are off. When api is on, `just release` should also run `just check-drift` before `pnpm test`.

The `openapi-sync` backend recipe name (`openapi`) is a convention the sibling backend justfile must expose; adjust the recipe name if the backend uses a different one. Do not invent a backend.

---

<a id="tmpl-vite"></a>

## vite.config.ts

```ts
import { execSync } from 'node:child_process'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Tag-driven releases: the git tag is the version. APP_VERSION (set by
// release.yml; shallow clones have no tags) wins; a dev build falls back
// to `git describe`.
function appVersion(): string {
  if (process.env.APP_VERSION) return process.env.APP_VERSION
  try {
    return execSync('git describe --tags --always', {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim()
  } catch {
    return '0.0.0+unknown'
  }
}

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion()),
  },
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      // Colocated vitest files live under src/routes/; they are not routes.
      routeFileIgnorePattern: '\\.(test|spec)\\.(ts|tsx)$',
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: { '@': new URL('./src', import.meta.url).pathname },
  },
})
```

`tanstackRouter` must come before `react()`.

---

<a id="tmpl-tsconfig"></a>

## tsconfigs

`tsconfig.json`:

```json
{
  "files": [],
  "compilerOptions": {
    "paths": { "@/*": ["./src/*"] }
  },
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

Add `{ "path": "./tsconfig.e2e.json" }` only if Playwright types need a separate project; otherwise include `playwright.config.ts` in `tsconfig.node.json`.

`tsconfig.app.json`: keep the create-vite / create-tsrouter-app compilerOptions, and ensure:

```json
{
  "compilerOptions": {
    "strict": true,
    "paths": { "@/*": ["./src/*"] },
    "jsx": "react-jsx",
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "verbatimModuleSyntax": true
  },
  "include": ["src"]
}
```

`tsconfig.node.json` `include`:

```json
{
  "include": [
    "vite.config.ts",
    "vitest.config.ts",
    "playwright.config.ts",
    "openapi-ts.config.ts"
  ]
}
```

Drop `playwright.config.ts` / `openapi-ts.config.ts` when those flags are off.

---

<a id="tmpl-vitest"></a>

## vitest.config.ts

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: { '@': new URL('./src', import.meta.url).pathname },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
    passWithNoTests: true,
  },
})
```

---

<a id="tmpl-vitest-setup"></a>

## vitest.setup.ts

```ts
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// RTL's automatic cleanup registers off the GLOBAL afterEach, which this
// rig doesn't expose (globals: false).
afterEach(() => cleanup())

// Node ≥22 ships a stub `localStorage` that prevents jsdom from installing
// a real one. Pull jsdom's implementation off the environment global.
declare global {
  var jsdom: { window: Window } | undefined
}
if (typeof globalThis.jsdom !== 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    get: () => globalThis.jsdom?.window.localStorage,
    configurable: true,
  })
  Object.defineProperty(globalThis, 'sessionStorage', {
    get: () => globalThis.jsdom?.window.sessionStorage,
    configurable: true,
  })
}
```

---

<a id="tmpl-index-html"></a>

## index.html

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="referrer" content="strict-origin" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title><project-name></title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`strict-origin` is the document policy so path/query never leave as `Referer` on the entry module, CSS, or favicon (those fetch before any JS runs). Do not weaken it to the browser default.

---

<a id="tmpl-main"></a>

## src/main.tsx

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { routeTree } from './routeTree.gen'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

const router = createRouter({
  routeTree,
  context: { queryClient },
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// biome-ignore lint/style/noNonNullAssertion: #root is in index.html
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
```

When the api flag is on, add `import './api/client'` next to `./index.css` so the generated client is configured once at boot.

---

<a id="tmpl-vite-env"></a>

## src/vite-env.d.ts

```ts
/// <reference types="vite/client" />

/** Injected by vite.config.ts `define`: the release tag (or `git describe`). */
declare const __APP_VERSION__: string

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

---

<a id="tmpl-app-version"></a>

## src/lib/app-version.ts

```ts
/** The release tag, injected at build time (vite.config.ts). */
export const APP_VERSION = __APP_VERSION__
```

---

<a id="tmpl-field-mode"></a>

## src/components/fields/field-mode.ts

```ts
// Interaction-mode parameter I-3 asks every editing field module to carry
// (save-immediately vs stage-then-commit) as one discriminated union
// every field shares, rather than each field inventing its own boolean.
//
// `staged`: the field's own edits never touch the wire. They call
// `onChange` with the next value; the HOST decides when it ships.
//
// `in-place`: the field's own edits ARE the wire write. `onCommit` is the
// mutation itself (or a thin wrapper); calling it is calling the write.

export type FieldMode<T> =
  | { kind: 'staged'; onChange: (value: T) => void }
  | { kind: 'in-place'; onCommit: (value: T) => void }

/** The one place a field module decides "stage it" vs "send it". */
export function commitField<T>(mode: FieldMode<T>, value: T): void {
  if (mode.kind === 'staged') mode.onChange(value)
  else mode.onCommit(value)
}
```

---

<a id="tmpl-root-route"></a>

## src/routes/\_\_root.tsx

```tsx
import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'

export interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: Outlet,
})
```

---

<a id="tmpl-index-route"></a>

## src/routes/index.tsx

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { APP_VERSION } from '@/lib/app-version'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <main>
      <h1><project-name></h1>
      <p>{APP_VERSION}</p>
    </main>
  )
}
```

---

<a id="tmpl-field-mode-test"></a>

## src/components/fields/field-mode.test.ts

```ts
import { describe, expect, it, vi } from 'vitest'
import { commitField } from './field-mode'

describe('commitField', () => {
  it('calls onChange in staged mode', () => {
    const onChange = vi.fn()
    commitField({ kind: 'staged', onChange }, 'x')
    expect(onChange).toHaveBeenCalledWith('x')
  })

  it('calls onCommit in in-place mode', () => {
    const onCommit = vi.fn()
    commitField({ kind: 'in-place', onCommit }, 'x')
    expect(onCommit).toHaveBeenCalledWith('x')
  })
})
```

---

<a id="tmpl-gitignore-append"></a>

## .gitignore append (after the GitHub Node.gitignore fetch)

```
# Vite
dist
dist-ssr
*.local

# Playwright
test-results/
playwright-report/
.playwright-mcp/

# Local agent & editor tooling (not shared)
.claude/
.cursor/
.tanstack/
```

---

<a id="tmpl-cliff"></a>

## cliff.toml

```toml
# git-cliff: https://git-cliff.org/docs/configuration
#
# Release notes and the next version are computed from conventional commits
# since the last `v*` tag. Nothing here is committed back to the repo: each
# GitHub Release carries its own section (the Releases page is the changelog).

[changelog]
trim = true
render_always = true
body = """
{% if version -%}
    ## {{ version }} ({{ timestamp | date(format="%Y-%m-%d") }})
{%- else -%}
    ## Unreleased
{%- endif %}
{% for group, commits in commits | group_by(attribute="group") %}
### {{ group | striptags | trim | upper_first }}
{% for commit in commits %}
- {% if commit.scope %}**{{ commit.scope }}:** {% endif %}\
{{ commit.message | split(pat="\n") | first | trim }}\
{% if commit.breaking %} ⚠️ BREAKING{% endif %}
{%- endfor %}
{% endfor %}
{%- if previous and previous.version and version %}
**Full diff:** [{{ previous.version }}...{{ version }}](https://github.com/<github_owner>/<github_repo>/compare/{{ previous.version }}...{{ version }})
{% endif %}
"""
footer = ""
postprocessors = [
  { pattern = '#([0-9]+)', replace = "[#${1}](https://github.com/<github_owner>/<github_repo>/issues/${1})" },
]

[git]
conventional_commits = true
filter_unconventional = true
split_commits = false
protect_breaking_commits = true
tag_pattern = "v[0-9].*"
sort_commits = "oldest"
topo_order = false
commit_parsers = [
  { message = "^chore\\(release\\)", skip = true },
  { message = "^chore\\(deps\\)|^build\\(deps\\)", skip = true },
  { breaking = true, group = "<!-- 0 -->💥 Breaking changes" },
  { message = "^feat", group = "<!-- 1 -->🚀 Features" },
  { message = "^fix", group = "<!-- 2 -->🐛 Bug fixes" },
  { message = "^perf", group = "<!-- 3 -->⚡ Performance" },
  { message = "^refactor|^rename", group = "<!-- 4 -->🛠 Refactoring" },
  { message = "^docs", group = "<!-- 5 -->📚 Documentation" },
  { message = "^test", group = "<!-- 6 -->🧪 Testing" },
  { message = "^ci|^build", group = "<!-- 7 -->⚙️ CI & build" },
  { message = "^chore|^style", group = "<!-- 8 -->🧹 Chores" },
  { message = ".*", group = "<!-- 9 -->Other" },
]

[bump]
# 0.x semantics: feat → minor, fix/perf/refactor → patch, breaking → minor
# until 1.0 is cut by hand.
features_always_bump_minor = true
breaking_always_bump_major = false
```

---

<a id="tmpl-ci"></a>

## .github/workflows/ci.yml

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0
      - uses: pnpm/action-setup@v6
        with:
          version: 11
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: pnpm
      - uses: extractions/setup-just@v4
      - uses: astral-sh/setup-uv@v7
      # On a rebase merge every PR commit lands on main verbatim and feeds
      # git-cliff's version bump, so each one must parse. A squash merge
      # takes the PR TITLE instead; the `pr-title` job covers that path.
      # uvx runs commitizen ephemerally; no Python env lives in this repo.
      - name: Check commit messages are conventional
        if: github.event_name == 'pull_request'
        run: uvx --from commitizen cz check --rev-range "origin/${{ github.base_ref }}..HEAD"
      - run: pnpm install --frozen-lockfile
      - run: just check
      - run: just test
      # api flag: uncomment / include:
      # - run: just check-drift
      - run: pnpm build

  pr-title:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    permissions:
      pull-requests: read
    steps:
      - uses: amannn/action-semantic-pull-request@v6
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: pnpm/action-setup@v6
        with:
          version: 11
      - uses: actions/setup-node@v7
        with:
          node-version: 24
      - run: pnpm audit --audit-level=high

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: pnpm/action-setup@v6
        with:
          version: 11
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: pnpm
      - uses: extractions/setup-just@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium
      - run: just e2e
        env:
          CI: true
      - uses: actions/upload-artifact@v7
        if: failure()
        with:
          name: playwright-report
          path: playwright-report
```

Omit the `e2e` job when the e2e flag is off. Include `just check-drift` after `just test` when the api flag is on.

---

<a id="tmpl-release"></a>

## .github/workflows/release.yml

Tag-driven: next version from conventional commits since the last `v*` tag (`cliff.toml`), tag is pushed, GitHub Release carries notes + the built `dist/`. No release commit; the tag alone records the version. Do not add a host-specific deploy step.

```yaml
name: Release

on:
  workflow_dispatch:
    inputs:
      notes:
        description: Release notes prose (markdown), shown above the generated changelog.
        type: string
        required: false
        default: ""

permissions:
  contents: write

concurrency:
  group: release
  cancel-in-progress: false

env:
  GIT_CLIFF_VERSION: "2.13.1"

jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: pnpm/action-setup@v6
        with:
          version: 11
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: pnpm
      - uses: extractions/setup-just@v4
      - run: pnpm install --frozen-lockfile
      - run: just check
      - run: pnpm test
      - run: pnpm build

  release:
    needs: gate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0

      - uses: pnpm/action-setup@v6
        with:
          version: 11

      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: pnpm

      - uses: astral-sh/setup-uv@v7

      - name: Compute next version
        id: next
        run: |
          set -euo pipefail
          TAG="$(uvx "git-cliff==${GIT_CLIFF_VERSION}" --bumped-version)"
          echo "next version: ${TAG}"
          if git rev-parse -q --verify "refs/tags/${TAG}" >/dev/null; then
            echo "::error::${TAG} already exists: no releasable commits since the last tag"
            exit 1
          fi
          echo "tag=${TAG}" >> "$GITHUB_OUTPUT"

      - name: Render release body
        env:
          NOTES: ${{ inputs.notes }}
          TAG: ${{ steps.next.outputs.tag }}
        run: |
          set -euo pipefail
          uvx "git-cliff==${GIT_CLIFF_VERSION}" --unreleased --tag "${TAG}" --strip header > changelog.md
          test -s changelog.md
          : > release-body.md
          if [ -n "${NOTES//[[:space:]]/}" ]; then
            printf '%s\n\n---\n\n' "${NOTES}" >> release-body.md
          fi
          cat changelog.md >> release-body.md

      - name: Push tag
        env:
          TAG: ${{ steps.next.outputs.tag }}
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git tag -a "${TAG}" -m "${TAG}"
          git push origin "${TAG}"

      - name: Build the site at the exact version
        env:
          TAG: ${{ steps.next.outputs.tag }}
        run: |
          set -euo pipefail
          pnpm install --frozen-lockfile
          APP_VERSION="${TAG#v}" pnpm build
          tar czf "<project-name>-${TAG}-dist.tar.gz" dist/

      - name: Create GitHub Release
        env:
          GH_TOKEN: ${{ github.token }}
          TAG: ${{ steps.next.outputs.tag }}
        run: |
          gh release create "${TAG}" \
            --repo "${{ github.repository }}" \
            --title "${TAG}" \
            --notes-file release-body.md \
            --verify-tag \
            "<project-name>-${TAG}-dist.tar.gz"
```

When the api flag is on, add `just check-drift` to the `gate` job after `just check`.

### Release setup checklist

1. **Baseline tag**: `git tag v0.1.0 <main tip> && git push origin v0.1.0` so the first real release lists only what changed since, not the whole history.
2. **Deploy**: not scaffolded. Wire the host of choice to the pushed tag / GitHub Release asset after the fact.

---

<a id="tmpl-dependabot"></a>

## .github/dependabot.yml

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    groups:
      minor-and-patch:
        update-types: ["minor", "patch"]

  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

---

<a id="tmpl-readme"></a>

## README.md stub

```markdown
# <project-name>

<description>

## Stack

TypeScript (strict) · Vite · React · TanStack Router (file-based) + TanStack Query · Tailwind + shadcn/ui · Biome · pnpm

## Development

```sh
just setup          # pnpm install + prek hooks (`brew install prek`)
just dev            # Vite dev server
just check          # biome + tsc
just test           # vitest
just e2e            # Playwright (if enabled)
```

## Release

Releases are tag-driven: the git tag is the version. `vite.config.ts`
injects it into the bundle as `__APP_VERSION__`. There is no `CHANGELOG.md`;
every GitHub Release carries its own notes.

```bash
just release                                    # local gate + trigger release workflow
just release "$(cat /path/to/release-notes.md)" # same, with prose above the generated changelog
just changelog                                  # preview the generated section
just next-version                               # preview the version the workflow would cut
```

Before the first release, push a baseline tag (`git tag v0.1.0 && git push origin v0.1.0`).
```

Drop the `just e2e` line when the e2e flag is off. When the api flag is on, add `just openapi-sync` to the Development block and note that `src/api/generated/` is regenerated, never hand-edited.

---

<a id="tmpl-playwright"></a>

## playwright.config.ts (e2e flag)

```ts
import { defineConfig, devices } from '@playwright/test'

const PORT = 5173
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `pnpm dev --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
})
```

Walking-skeleton e2e hits the Vite dev server only. Do not stand up a backend here. If a later project needs a real API, add a dedicated webServer entry then (hermetic, on ports that do not collide with a developer's `:5173` / API port).

---

<a id="tmpl-e2e-home"></a>

## e2e/home.spec.ts (e2e flag)

```ts
import { expect, test } from '@playwright/test'

test('home renders', async ({ page }) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: '<project-name>' }),
  ).toBeVisible()
})
```

---

<a id="tmpl-openapi-ts"></a>

## openapi-ts.config.ts (api flag)

```ts
import { defineConfig } from '@hey-api/openapi-ts'

// Generates the typed API client from the committed openapi.json snapshot.
// Regenerate via `just openapi-sync`; never hand-edit src/api/generated.
export default defineConfig({
  input: 'openapi.json',
  output: 'src/api/generated',
  plugins: ['@hey-api/client-fetch', '@tanstack/react-query'],
})
```

Commit a snapshot `openapi.json` (copy from the backend, or a minimal `{"openapi":"3.1.0","info":{"title":"<project-name>","version":"0.0.0"},"paths":{}}` stub). Run `pnpm exec openapi-ts` once so `src/api/generated/` exists.

---

<a id="tmpl-api-client"></a>

## src/api/client.ts (api flag)

Runtime configuration for the generated client. Import this module once from `main.tsx`. Do not add product-specific 403 handlers here; those belong to the app, later.

```ts
import { client } from './generated/client.gen'

const REFERRER_POLICY = 'no-referrer' as const

client.setConfig({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000',
  credentials: 'include',
  referrerPolicy: REFERRER_POLICY,
})

export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export function statusOf(error: unknown): number | undefined {
  if (
    typeof error === 'object' &&
    error !== null &&
    'status_code' in error &&
    typeof (error as { status_code: unknown }).status_code === 'number'
  ) {
    return (error as { status_code: number }).status_code
  }
  return undefined
}

export function isUnauthorized(error: unknown): boolean {
  return statusOf(error) === 401
}

export function errorDetail(error: unknown): string {
  if (error && typeof error === 'object' && 'detail' in error) {
    return String((error as { detail: unknown }).detail)
  }
  return 'Something went wrong. Please try again.'
}
```

Cookie sessions + `credentials: 'include'` is the default. If the API is token-based, replace `credentials` with the header interceptor in this file; still the one place components never think about auth plumbing.
