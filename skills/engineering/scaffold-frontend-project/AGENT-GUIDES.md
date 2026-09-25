# Agent guideline templates

Copy these into every scaffolded project. Generalize `<project-name>` in the design guide overview only. Do not paraphrase I-1 through I-6.

---

## AGENTS.md

```markdown
# AGENTS.md

Hard project invariants and design baseline for agents and human contributors.
These are contracts, not style preferences. Violating an invariant is a
correctness or maintainability bug.

Domain-specific guides may be added under `docs/agents/` as the project grows.
The general coding baseline lives in [docs/agents/design.md](docs/agents/design.md).

---

## I-1: A fact is derived once; a second file means extract first

The moment a predicate, mapping, or availability decision is about to appear
in a second file, it moves to a shared module in that same PR; never "in a
cleanup later". Two copies of one derivation always drift, and the drift is
invisible until they disagree in front of a user.

## I-2: The second copy is the deadline

Pasting a component's markup, copy, or styling a second time is the moment
the shared component gets extracted, not the third time, not when it hurts.
One consumer is a hypothetical seam; two consumers make it real, and real
seams get a module.

## I-3: A capability belongs to the field, not the surface that first needed it

Build editing affordances (a picker, a tag editor, a notes field) as
standalone fields whose interaction mode (save-immediately vs
stage-then-commit) is a parameter, then mount them where needed. A surface
that deliberately withholds a field's capability must say why in a comment
at the mount point; a silent gap reads as a bug, because it is one.

The shared parameter is `FieldMode` in `src/components/fields/field-mode.ts`.
New field modules take a `FieldMode<T>` and commit through `commitField`.

## I-4: A field on the wire needs a named reader, or an issue number

Any API contract field shipped without a consumer carries an issue for the
consumer, filed in the same PR that ships the field. "Nothing reads it yet"
in a comment with no issue number is how two repos silently agree to waste
the work.

## I-5: A test that asserts an affordance is shown must also assert it works

Never assert presentation alone (a lit keycap, an enabled button, a visible
link) without exercising the behavior it advertises. A presentation-only
assertion turns a bug into a spec: the suite then defends the lie against
the fix.

## I-6: When a component gains a second host, diff the hosts

Review discipline for shared components: the PR that mounts an existing
component in a new host must enumerate what the first host wires up
(sub-components, empty states, skeletons, keyboard reach) and show each item
either wired or deliberately excluded with a reason. Anything a host must
remember to wire is a leak; prefer moving it inside the component (I-1).

---

## Commits and releases

Commit subjects are conventional-commit format, enforced by the prek
`commit-msg` hook and `cz check` in CI, and consumed by git-cliff for the
version bump and release notes. Releases are tag-driven: the git tag is the
version; never write a version into `package.json`, `src/lib/app-version.ts`,
or any other file; the build injects it (`__APP_VERSION__`).
```

---

## docs/agents/design.md

```markdown
# General Software Design Guide

**Status**: Approved

---

## Overview

This document defines the general coding philosophy and design preferences for
<project-name>. Domain-specific guides under `docs/agents/` build on this
baseline; this one applies everywhere.

The preferred style is a **pragmatic mix of React components and plain
TypeScript modules**. Components render and wire events. Domain logic,
predicates, and mappings live in named modules next to them (`*-model.ts`)
so they can be tested without a renderer. The test is always clarity and
navigability, not pattern adherence.

---

## Core Decisions

| Decision | Choice | Rationale |
|---|---|---|
| UI library | React function components | No class components |
| Routing | TanStack Router, file-based, under `src/routes/` | Typed routes; colocated tests are ignored by the plugin |
| Server state | TanStack Query | No `useEffect` fetches |
| Styling | Tailwind 4 + shadcn/ui | Add primitives via `pnpm dlx shadcn@latest add`; do not fork `components/ui` lightly |
| Editing fields | `FieldMode` + `commitField` | I-3: capability belongs to the field |
| Tests | Colocated `*.test.ts(x)` via vitest + testing-library | Next to the module they prove; e2e is Playwright |
| Generated code | Commit it; never hand-edit | `routeTree.gen.ts`, `src/api/generated/` |
| Version | Git tag | `package.json` stays `0.0.0`; Vite injects `__APP_VERSION__` |
| Errors | Fail loudly | No silent catch, no "best effort" degradation |

---

## 1. Module organization

```
src/
  routes/                 # file-based routes; tests colocated, ignored by the router plugin
  components/
    ui/                   # shadcn primitives: generated, lightly wrapped
    fields/               # standalone editing affordances (I-3)
    <feature>/            # feature UI + `*-model.ts` for domain logic
  lib/                    # shared predicates, mappings, formatters (I-1)
  api/                    # client wrapper; generated/ is machine-owned
  hooks/                  # hooks that are not a field and not a route
```

A predicate used by two surfaces lives in `lib/` or a feature `*-model.ts`
**in the same PR** (I-1). Do not leave a `// TODO extract` comment.

---

## 2. Components vs models

Reach for a `*-model.ts` (plain functions + types, no React) when:

1. **A fact is derived**: availability, labels, mappings, sorting, filtering.
2. **Two surfaces would otherwise re-derive it** (I-1).
3. **The logic is worth a name** that a test can pin.

The component then renders what the model already decided. Keep JSX thin.

```ts
// Avoid: derivation buried in the component, about to be copied
function Toolbar({ row }: { row: Row }) {
  const canEdit = row.status === 'open' && !row.locked
  return canEdit ? <EditButton /> : null
}

// Prefer: named fact, tested without a renderer
// lib/row-actions.ts
export function canEdit(row: Row): boolean {
  return row.status === 'open' && !row.locked
}
```

Hooks (`use-*.ts`) are for stateful orchestration that is awkward as a
pure function. They call the model; they are not a second place to hide
the same predicate.

---

## 3. Server state

All remote reads/writes go through TanStack Query (and the generated
OpenAPI client when the `api` flag is on).

- Default QueryClient: `retry: false`; a 401 is an answer, not a flake.
- Do not add `useEffect(() => { fetch(...) }, [])`.
- Invalidate from a named helper when more than one surface must agree
  on what "stale" means (I-1).

---

## 4. Fields

Every editing affordance is a standalone field module under
`src/components/fields/` (or a feature `fields/` folder) that takes
`FieldMode<T>` and commits through `commitField`:

- `staged`: edits call `onChange`; the host decides when to ship.
- `in-place`: edits call `onCommit`; that call **is** the write.

A field never inspects "which screen am I on" to decide the mode. A host
that withholds a capability comments why at the mount point (I-3).

---

## 5. Tests

Colocate `*.test.ts` / `*.test.tsx` next to the module. Route tests live
under `src/routes/`; the Vite plugin ignores `\\.(test|spec)\\.(ts|tsx)$`.

- Model tests: no renderer.
- Component tests: testing-library; assert behavior, not just presentation
  (I-5). Click the button you asserted was enabled.
- E2e (when enabled): Playwright against the real Vite server. Hermetic
  by default; no live third-party sandboxes in the walking skeleton.

`vitest` runs with `globals: false`. Import `describe` / `it` / `expect`
from `vitest`. `vitest.setup.ts` calls RTL `cleanup` because automatic
cleanup hooks the global `afterEach`, which this rig does not expose.

---

## 6. Errors

Raise (or rethrow) at the point of failure; recover at the recovery
point. Do not swallow. Do not add a catch that logs and continues.

A route `errorComponent` is a recovery point. An empty `catch {}` is not.

---

## 7. Generated code

Never hand-edit:

- `src/routeTree.gen.ts`: TanStack Router Vite plugin
- `src/api/generated/`: `pnpm exec openapi-ts` (api flag)

Biome excludes both. A dirty tree after regeneration means a hook is
touching generated files; fix the exclude, do not "just commit it".
```
