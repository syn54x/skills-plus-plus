---
name: scaffold-frontend-project
description: Scaffolds new frontend SPAs with Vite, React, TypeScript, pnpm, Biome, TanStack Router, TanStack Query, Tailwind, shadcn/ui, prek, vitest, optional Playwright and OpenAPI client, and GitHub Actions (CI, tag-driven release). Use when the user asks to create, bootstrap, or scaffold a new frontend project, React app, Vite SPA, or web UI.
---

# Scaffold Frontend Project

Opinionated Vite + React SPA bootstrap. Stack is locked; do not substitute Next.js, TanStack Start, ESLint/Prettier, npm/yarn, or React Router.

Templates live only in [REFERENCE.md](./REFERENCE.md). Agent guideline payloads: [AGENT-GUIDES.md](./AGENT-GUIDES.md). Apply the **feature matrix** below; do not invent alternate stacks.

## Discovery (ask before scaffolding)

Use `AskQuestion` when available; otherwise ask conversationally. Do not scaffold until answers are clear.

| Question | Options / notes |
|----------|-----------------|
| **Project name** | kebab-case; used as `package.json` `name` and the home-page heading |
| **Target path** | New directory or existing empty directory |
| **Description** | One-line README blurb |
| **GitHub org/repo** | Needed for `cliff.toml` links and release workflow placeholders |
| **Backend API?** | If yes → `api` flag (OpenAPI snapshot + `@hey-api/openapi-ts` client). Ask for the sibling backend path (default `../<project-name>-backend`) whose justfile exposes an `openapi` recipe. |
| **Playwright e2e?** | Default yes → `e2e` flag |
| **syn54x engineering skills?** | If yes → `syn54x-skills` flag (hand off to `/setup-syn54x-skills` after verify) |

Do not ask about framework, bundler, linter, package manager, or CSS. Those are fixed.

Node **24**. pnpm **11**.

## Feature matrix

Copy selected rows. Paths and bodies come from [REFERENCE.md](./REFERENCE.md). `baseline` is always on.

| Flag | deps / tools | files | prek Δ | workflows | verify |
|------|--------------|-------|--------|-----------|--------|
| **baseline** | pnpm; Vite; React 19; TS strict; Biome; TanStack Router + Query; Tailwind 4; shadcn/ui; vitest + testing-library; prek (system) | `vite.config.ts`, `biome.json`, `prek.toml`, `justfile`, `cliff.toml`, `AGENTS.md`, `docs/agents/design.md`, `src/main.tsx`, `src/routes/__root.tsx`, `src/routes/index.tsx`, `src/lib/app-version.ts`, `src/components/fields/field-mode.ts`, vitest config + setup, `ci.yml`, `release.yml`, `dependabot.yml` | pre-commit-hooks + biome + tsc + commitizen | `ci.yml`, `release.yml` | `just check && just test && pnpm build` |
| **e2e** (default on) | `@playwright/test` | `playwright.config.ts`, `e2e/home.spec.ts` | none | `e2e` job in `ci.yml` | `just e2e` |
| **api** | `@hey-api/openapi-ts` | `openapi-ts.config.ts`, `openapi.json` (snapshot), `src/api/client.ts`; `just openapi-sync` / `check-drift` | exclude `openapi.json` + `src/api/generated/` from whitespace hooks | `check-drift` step | `just check-drift` |

When **e2e** is off: omit Playwright files and the `e2e` CI job.

When **api** is off: omit OpenAPI files, `check-drift`, and the generated-client excludes.

## Scaffolding workflow

```
- [ ] 1. Discovery complete → selected matrix rows
- [ ] 2. create-tsrouter-app (file-router + biome + shadcn + query)
- [ ] 3. .gitignore (GitHub Node.gitignore)
- [ ] 4. Apply matrix → copy templates from REFERENCE.md
- [ ] 5. Agent guidelines from AGENT-GUIDES.md (invariants verbatim)
- [ ] 6. Substitute placeholders (`<github_owner>`, `<project-name>`, …)
- [ ] 7. pnpm install && prek install
- [ ] 8. Verify = baseline verify ∪ selected feature smokes
- [ ] 9. Hand off to `/setup-syn54x-skills` (only if `syn54x-skills`)
```

### Step 2: create-tsrouter-app

```bash
pnpm dlx create-tsrouter-app@latest <project-name> \
  --template file-router \
  --package-manager pnpm \
  --toolchain biome \
  --add-ons shadcn,tanstack-query \
  --no-git
```

If the target path already exists and is empty, pass `.` as the name after `cd`ing into it.

This is the analog of `uv init`. It is **not** the finished project. Immediately overlay templates from [REFERENCE.md](./REFERENCE.md):

- Delete the generator's demo/example UI (counter, placeholder marketing, ESLint/oxlint leftovers).
- `package.json` `version` stays `"0.0.0"` forever; the git tag is the version.
- Scripts must include `lint` / `fix` / `test` (and `e2e` when selected). Drop any `oxlint` / `eslint` scripts.

If shadcn add-on did not run, `pnpm dlx shadcn@latest init --yes --base radix` then `pnpm dlx shadcn@latest add button`. Do not hand-write `src/components/ui/` or brand CSS.

### Step 3: .gitignore

Fetch verbatim from GitHub (do not hand-edit the fetch):

```bash
curl -fsSL https://raw.githubusercontent.com/github/gitignore/main/Node.gitignore -o .gitignore
```

Then append the project-specific block from [REFERENCE.md](./REFERENCE.md) `#tmpl-gitignore-append`.

### Step 4: Apply matrix

For each selected flag, copy the listed files from [REFERENCE.md](./REFERENCE.md). Do not restate template bodies here.

- **baseline** always includes FieldMode (`src/components/fields/field-mode.ts`) and tag-driven `__APP_VERSION__`.
- **api:** never hand-edit `src/api/generated/`. The committed `openapi.json` is the contract seam.
- Document release setup in the README (see reference release checklist).

### Step 5: Agent guidelines

Copy from [AGENT-GUIDES.md](./AGENT-GUIDES.md). Do not paraphrase I-1 through I-6. Substitute `<project-name>` in `docs/agents/design.md`.

Do not create `CLAUDE.md`. Do not pre-seed `docs/agents/issue-tracker.md`, `docs/agents/domain.md`, `docs/agents/triage-labels.md`, `CONTEXT.md`, `PRODUCT.md`, or `DESIGN.md`; issue-tracker / domain / triage-labels / CONTEXT belong to step 9 when `syn54x-skills` is on.

### Step 6: Placeholders

Substitute `<project-name>`, `<description>`, `<github_owner>`, `<github_repo>` everywhere copied from templates.

### Step 7: Install hooks

```bash
pnpm install
# prek is a system tool, not an npm dep
command -v prek >/dev/null || { echo "install prek: brew install prek"; exit 1; }
prek install
```

`prek.toml` sets `default_install_hook_types = ["pre-commit", "commit-msg"]` so one `prek install` wires both.

### Step 8: Verify

Run baseline verify, then each selected feature's `verify` cell from the matrix.

### Step 9: syn54x engineering skills (`syn54x-skills` only)

Skip this step entirely when the user declined.

When `syn54x-skills` is on, after verify, tell the user to open the new project and run `/setup-syn54x-skills` there. It is user-invoked, so only they can start it: do not read its `SKILL.md` and follow it by hand, and do not pre-write its output. `AGENTS.md` already exists (step 5), so the setup will **edit** it (adding `## Agent skills`, and the SDD routing block if they turn the pipeline on) rather than create `CLAUDE.md`.

If the skills-plus-plus set is not installed, tell the user to install it first (`/plugin marketplace add syn54x/skills-plus-plus`, then `/plugin install skills-plus-plus@syn54x`), then run `/setup-syn54x-skills` in the new project.

## Anti-patterns

- Do not scaffold Next.js, Remix, TanStack Start, or React Router
- Do not use ESLint, Prettier, or oxlint; use Biome
- Do not use npm or yarn; use pnpm
- Do not bump `package.json` `version`; keep `0.0.0`; the git tag is the version
- Do not bump versions locally; use `just release` → release workflow
- Do not write a `CHANGELOG.md`; GitHub Releases carry the notes (git-cliff)
- Do not use `.pre-commit-config.yaml` when `prek.toml` suffices
- Do not add prek as an npm dependency; it is a system binary (`brew install prek`)
- Do not hand-write `.gitignore`; fetch GitHub Node.gitignore
- Do not hand-edit `src/routeTree.gen.ts` or `src/api/generated/`
- Do not fetch server state in `useEffect`; use TanStack Query
- Do not copy a product design system, fonts, or brand tokens into the scaffold
- Do not bake a host (Render, Vercel, Cloudflare) into `release.yml`
- Do not create `CLAUDE.md` during scaffold; `AGENTS.md` is the agent file
- Do not run or reproduce `setup-syn54x-skills` yourself; it is user-invoked, so step 9 hands it to the user
- Do not skip the step-9 handoff when the user opted in

## Additional resources

- Templates: [REFERENCE.md](./REFERENCE.md)
- Agent guideline templates: [AGENT-GUIDES.md](./AGENT-GUIDES.md)
- Engineering-skill config: `/setup-syn54x-skills`, run by the user (step 9, `syn54x-skills` flag)
