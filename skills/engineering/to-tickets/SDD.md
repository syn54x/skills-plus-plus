# SDD pass

Read this when the repo's `CLAUDE.md` or `AGENTS.md` contains the `<!-- sdd-routing -->` block (`/setup-syn54x-skills` Section D writes it). The pipeline builds every ticket without conversation: a worker sees only its own issue, so each one has to carry what the worker needs. This pass changes how steps 4 and 5 of `SKILL.md` finish; everything before them is unchanged.

The source is an **epic** issue written by `to-spec`. Read the routing block's Mode line: **org** mode sets issue types and may use issue fields; **labels-only** mode uses labels for everything.

## 1. Harden each ticket before publishing

Once the user approves the breakdown in step 4, add four sections to every ticket. Read the code first; do not guess.

````markdown
## Files owned

- Create: `db/migrations/2026-09-22-invoice-status.sql`
- Modify: `src/billing/invoice.ts`, `src/billing/schema.ts`
- Test: `src/billing/__tests__/invoice.test.ts`

## Interfaces

- Consumes: `InvoiceStatus` enum from `src/billing/schema.ts` (ticket 1)
- Produces: `createInvoice(input: InvoiceInput): Promise<Invoice>`, used by ticket 4
- Produces: event `invoice.created` on the event bus, payload `{ id: string; customerId: string }`, used by ticket 5

## Test scenarios

- Happy path: valid input → invoice persisted with status `draft`, `invoice.created` emitted once
- Edge case: duplicate `externalRef` → returns the existing invoice, no second event
- Error path: unknown `customerId` → `NotFoundError`, nothing persisted
- Integration: `POST /invoices` → 201 with the invoice id, row visible in `invoices`

## Verify

```bash
pnpm test -- src/billing
pnpm typecheck
```
````

Rules:

- **Files owned** is the parallel-safety contract, and it overrides the "avoid specific file paths" rule at the end of `SKILL.md`: here a path is a claim on the file, not a description of the code. `Modify` and `Test` paths must not appear in two tickets that can run at the same time; two tickets may each *create* different files in one directory. If a path collides, merge the tickets or add a blocking edge. Directories (`src/billing/**`) are allowed but shrink the frontier, so prefer files.
- **Interfaces** is how a worker learns the names its neighbours use. **Consumes** lists what this ticket relies on from earlier tickets, naming the producer; **Produces** lists exact names, parameter and return types, events and routes that later tickets rely on, naming the consumer. Every Consumes line needs a blocking edge to its producer. Across repos, name the ticket as `owner/repo#N` and state the contract, not the code (the route and its request/response shape, the event and payload, the generated-client method), and add an **Available when** clause ("backend PR merged to `feat/<slug>` and preview deployed"), because a cross-repo consumer is ready only when the producer is reachable, not merely closed.
- **Test scenarios** are what the worker turns into tests, one line each, prefixed Happy path / Edge case / Error path / Integration. Include only the categories that apply. A ticket with no behavioural change says `Test expectation: none, because <reason>` rather than leaving the section empty.
- **Verify** is fenced, runnable from the repo root, and green means done. The worker runs it before opening its PR and the reviewer runs it again. No "manually check that…" lines.
- **No placeholders.** Any of these means the ticket is not ready: `TBD`, `TODO`, `?`, an empty section; "add appropriate error handling / validation / edge cases"; "write tests for the above" with no scenarios; "similar to ticket N" instead of the content; a name in Interfaces that no ticket defines; an acceptance criterion that says what to do without saying how it is checked. Publish that ticket with `needs-info` instead of `ready-for-agent`, and tell the user what is missing.

Then one **consistency pass**: every name in a Consumes line appears in an earlier ticket's Produces line with the same signature, and every requirement in the epic maps to at least one ticket. Fix inline; don't re-quiz the user for these.

**Size** each ticket with exactly one size (the `size:*` label, or the `Effort` field if the routing block names one):

| Size | Meaning | Builds via |
| --- | --- | --- |
| `size:S` | one context window, at most 3 files, no schema or cross-package change | the cloud workflow (if installed) or locally |
| `size:M` | its sections need careful reading; one worker, one worktree | `/build-epic` or `/implement` |
| `size:L` | cross-cutting, touches migrations or shared contracts | `/build-epic` only, ceiling-tier worker |

## 2. Publish natively

Step 5's real-tracker branch applies, with these specifics:

- **Where each ticket lives.** A ticket lives in the repo its Files owned belong to. A frontend epic often has backend tickets; create those in the backend repo, with the epic's URL as parent. Sub-issues and blocking edges work across repos under the same owner, and every `gh issue` command accepts a URL, so refer to cross-repo tickets by URL from here on. A ticket never lists paths in two repos; that is two tickets. Every repo involved must have run `/setup-syn54x-skills` with Section D.
- **Create** in dependency order, blockers first, so each ticket's parent and blocking edges are native from the start and the ready queue can be computed by `gh`. Blockers in another repo go in by URL:

  ```bash
  EPIC_URL=$(gh issue view "$EPIC" --json url --jq .url)
  gh issue create -R <owner/repo> --title "<title>" --body-file /tmp/ticket.md \
    --parent "$EPIC_URL" --blocked-by 101,102 \
    --label ready-for-agent --label size:M                            # --type Task in org mode
  gh issue edit "$EPIC" --type Epic                                   # org mode only
  ```

  Keep the `## Blocked by` prose in the body too, for humans; the native edge is what the orchestrator trusts. To fix an edge later: `gh issue edit "$N" --add-blocked-by <n>` or `--remove-blocked-by <n>`.

- Add the `needs-plan` label to the epic while you publish, and remove it once the plan comment below is up.

## 3. Pin the plan on the epic

Compute dependency layers from the native links: layer *n* holds every ticket whose blockers all sit in layers below *n*, and layer 0 is the initial ready queue. Upsert **one** comment on the epic whose first line is `<!-- sdd-plan -->`, and rewrite it whenever tickets change. Test paths are left out of the table; the build's safety check reads them from the bodies.

```markdown
<!-- sdd-plan -->
## Plan

**Goal:** <one line from the epic>
**Constraints:** <stack, conventions, anything the epic's Implementation Decisions fix>
**Integration branch:** `feat/<slug>` (created by build-epic)

| Layer | Repo | Ticket | Size | Blocked by | Files owned (C/M) |
| --- | --- | --- | --- | --- | --- |
| 0 | pinch-backend | #101 add invoice status column | S | none | C: `db/migrations/…`; M: `src/billing/schema.ts` |
| 0 | pinch-backend | #102 invoice events | S | none | C: `src/events/invoice.ts` |
| 1 | pinch-backend | #103 create invoice endpoint | M | #101, #102 | M: `src/billing/invoice.ts`, … |
| 2 | pinch-frontend | #104 invoice UI | M | pinch-backend#103 | M: `src/invoices/**` |

**Repos:** pinch-frontend (epic), pinch-backend.
```

Leave out the Repo column and the Repos line for a single-repo epic. To upsert:

```bash
REPO=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
ID=$(gh api "repos/$REPO/issues/$EPIC/comments" --paginate \
  --jq '.[] | select(.body | startswith("<!-- sdd-plan -->")) | .id' | head -n1)
if [ -n "$ID" ]; then gh api -X PATCH "repos/$REPO/issues/comments/$ID" -F body=@/tmp/plan.md
else gh api -X POST "repos/$REPO/issues/$EPIC/comments" -F body=@/tmp/plan.md; fi
```

Optional: if the epic lacks a `## Spec deltas` section (ADDED / MODIFIED / REMOVED behaviours), offer to add one so the epic doubles as the change record. Change nothing else in the epic body; `to-spec` owns it.

## 4. Report

One table: ticket, size, blocked by, ready or `needs-info`. Then the next step: `/build-epic <epic#>` for M and L, while `size:S` tickets are picked up by the cloud workflow if the repo installed it.
