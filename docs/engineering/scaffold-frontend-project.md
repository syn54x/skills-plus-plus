## What it does

`scaffold-frontend-project` bootstraps a new single-page app on one opinionated stack: Vite, React, TypeScript, `pnpm`, Biome, TanStack Router and Query, Tailwind, shadcn/ui, `vitest`, `prek`, and GitHub Actions for CI and tag-driven release. It asks a few questions, turns the answers into **feature flags**, starts from the Vite template and overlays only the files those flags select.

It also writes agent guidelines into `AGENTS.md`: six invariants for front-end code (derive once, no second copy of a value, and so on) copied verbatim, so every agent that later works in the repo starts from the same rules.

## When to reach for it

Type `/scaffold-frontend-project`, or the agent reaches for it when you ask to create, bootstrap or scaffold a new frontend project, React app, Vite SPA or web UI.

| You want… | Flag it sets |
| --- | --- |
| End-to-end tests | `e2e` (Playwright) |
| A typed client for a backend's OpenAPI spec | `api` (`@hey-api/openapi-ts`) |
| The syn54x engineering skills configured in the new repo | `syn54x-skills` |

For a Python service or library, use [scaffold-python-project](../engineering/scaffold-python-project.md).

## Prerequisites

Node 24 and `pnpm` 11 on your machine. It creates the project in a new directory.

## Common questions

**Why doesn't it run `/setup-syn54x-skills` for me?** That setup is user-invoked, so no skill can start it. With the `syn54x-skills` flag on, the scaffold ends by telling you to run it in the new project.

## It's working if

- `just check && just test && pnpm build` passes in the new repo, then each chosen flag's own check.
- `AGENTS.md` carries the invariants word for word, and `CLAUDE.md` does not exist.
- Only the flags you chose have files.

## Where it fits

`scaffold-frontend-project` is a **run-once setup** at the start of a repo, before [setup-syn54x-skills](../engineering/setup-syn54x-skills.md). [ask-syn54x](../engineering/ask-syn54x.md) routes the whole set.
