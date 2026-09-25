# Parallel safety check

Run over the set of **ready** tickets before every wave. Input: each ticket's `## Files owned` and `## Interfaces` sections plus its `blockedBy` links. Output: the tickets that may run concurrently in this wave, and any edges to add.

In a multi-repo epic, sections 1, 2 and 4 run **per repo** (paths in different repos never collide); section 3 runs **across repos**.

## 1. File overlap

Build the map path → tickets from every `Files owned` list, expanding globs against the current tree. Keep the `Create` / `Modify` / `Test` tag on each entry.

- A path under `Modify` or `Test` in two ready tickets → **conflict**. Resolve by adding a `--add-blocked-by` edge (smaller or more foundational ticket first) or by holding one back this wave. Never dispatch both.
- A path under `Create` in one ticket and `Modify` in another → **conflict**, same resolution; the modifier depends on the creator.
- Two tickets that each `Create` a *different* path in the same directory → fine.
- The same path under `Create` in two tickets → the plan is wrong; report it, do not pick one.
- A ticket with no `Files owned` section, or an untagged flat list → not ready. Label `needs-info`, remove `ready-for-agent`, report.

## 2. Shared-state files

These are conflicts even when only one ticket lists them, because the other ticket will touch them implicitly:

| File kind | Why | Rule |
|---|---|---|
| lockfiles (`pnpm-lock.yaml`, `uv.lock`, `Cargo.lock`, …) | any dependency add rewrites them | at most one ticket per wave adds dependencies |
| migration directories with ordered names | two new migrations race on the sequence | at most one ticket per wave adds a migration |
| generated clients / schemas (`openapi.json`, `schema.prisma`, generated SDKs) | regeneration touches everything | producer ticket runs alone, consumers next layer |
| root config (`tsconfig`, `pyproject`, CI workflows, `CLAUDE.md`) | global blast radius | one ticket per wave, ceiling tier |
| shared test fixtures / factories | silent semantic conflicts | treat like any owned file |

## 3. Interface pairs

For every `Consumes` line in a ticket's `## Interfaces`:

- The producing ticket it names must be in an earlier layer. If the `blockedBy` link is missing, add `gh issue edit <consumer> --add-blocked-by <producer>`.
- The name must appear in that producer's `Produces` list with the same signature. A mismatch is a plan bug: fix the ticket bodies before dispatch, since two workers would otherwise code against different names.
- Two ready tickets that both `Produce` the same name, or both modify the same interface → conflict, same resolution as file overlap.
- **Cross-repo pair** (producer in the backend, consumer in the frontend): the edge is not enough. The consumer's Consumes line carries an *Available when* clause; the consumer is ready only when that is true on the producer repo's integration branch (route deployed to the preview or runnable locally, spec regenerated, client published). Check it before dispatch and say what you checked in the wave table.

## 4. Wide refactors

A ticket whose `Files owned` spans more than roughly a third of the tree (a rename, a retype) is a **wide refactor**. It runs **alone** in its wave, ceiling tier, and every other ticket is blocked by it. If `to-tickets` sequenced it as expand → migrate batches → contract, keep that order; do not merge the batches.

## 5. Output

A table for the wave-plan message:

| Ticket | Runs this wave? | Reason |
|---|---|---|
| #101 | yes | none |
| #102 | yes | none |
| #105 | held | shares `src/billing/schema.ts` with #101; edge added #105 ← #101 |

Every edge you add goes into the plan comment on the epic, so the next orchestrator sees the same graph you do.
