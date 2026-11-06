## What it does

`to-tickets` splits an Epic into Sub-issues on GitHub. Each Sub-issue is a vertical slice, linked to the Epic as its parent, with native blocked-by edges to the slices it needs and the full Ticket contract in its body. The Epic gets a single plan comment that lays them out in layers.

It decides the breakdown and leaves each Sub-issue's contents to [harden](harden.md). `to-tickets` picks the slices and their edges, gets your approval, creates the issues, and calls `harden` once for each. What it adds is the view across all of them: two Sub-issues that would lock the same file, a name one consumes that its blockers never produce, a requirement from the Epic that shrank on the way into a Sub-issue, and a value one Sub-issue works out from another module's output when that module could hand it over.

## When to reach for it

You type `/to-tickets <epic>`; the agent never starts it on its own. It is the third step of the Epic path (grill, to-spec, `to-tickets`), and `/build <epic>` comes after it. Running it in the same conversation as to-spec keeps the reasoning behind the Epic in view.

| Your situation | Use |
| --- | --- |
| A written Epic needs splitting into buildable work | `/to-tickets <epic>` |
| The plan is still being argued | [grill](grill.md), then to-spec |
| A single filed issue needs to become buildable | triage, which calls [harden](harden.md) once |
| One pull request holds the whole change | no Epic: triage it as a One-off |

`ask-spp` routes between every skill when the right one is unclear.

## Prerequisites

The repo needs a Routing block in its `CLAUDE.md` or `AGENTS.md`, written by `/setup-spp`. `to-tickets` reads the Mode, Sizes and Laws lines from it, and stops if there is none.

## Tracer bullets

Every slice is a *tracer bullet*: once it merges, a person can watch something work. "Export one saved report as CSV" is a slice; "add the exports table" is a layer, and on its own it shows nothing. Layer-shaped slices leave each worker grading code another worker owns, and nothing runs until the last one lands.

When one change breaks every reader at once, such as renaming the field that the export, the list view and the scheduler all read, the slices follow *expand and contract* instead. One slice adds the new field beside the old, one slice per reader moves over to it, and a last slice drops the old field.

## From approval to plan

1. You approve a numbered list of slices, each with its blockers and what you will see working.
2. The Epic gets `needs-plan`.
3. The Sub-issues are created with every blocker first, carrying native parent and blocked-by edges.
4. `harden` writes each contract and its size.
5. The set is checked as a whole: shared file locks, Consumes against Produces, requirements against the Epic, and values worked out twice (one Sub-issue deriving what another module already holds).
6. Clean Sub-issues get `ready-for-agent`, `spp plan` pins the plan, and `needs-plan` comes off the Epic.

## Common questions

**Why does the Epic get a `needs-plan` label?**
An Epic that still says `ready-for-agent` matches the readiness rule, so a build could try to claim the Epic itself. `needs-plan` covers the time its Sub-issues are being created and hardened, and comes off once the plan is pinned.

**Why are Sub-issues created before they are hardened?**
`harden` writes into an issue, and `spp lint ticket` reads one from GitHub, so the issue must exist first. It gets `ready-for-agent` only after every check has passed, so no worker can pick it up half-written.

**Two Sub-issues that looked independent ended up one after the other. Why?**
Their Files owned shared a path both would modify. A Wave never runs two workers on the same file, so `to-tickets` either adds an edge between them or merges them. You lose a little parallelism and avoid a conflict nobody would have noticed until the merge.

**What does a `Narrows:` line mean?**
That Sub-issue delivers less of a requirement than the Epic states, and you agreed to it during the run. The same words appear as a Narrowed line on the plan, which reviewers read as accepted scope. A difference nobody agreed to is fixed in the Sub-issue instead of being recorded.

**One Sub-issue came out `needs-info`. Can the rest be built?**
Yes. Only `ready-for-agent` Sub-issues join the Ready queue, so the build takes those. The `needs-info` one waits, with anything it blocks, until its gaps are settled and `harden` runs on it again.

## It's working if

- Every Sub-issue answers "what will I see working once this merges?"
- The Epic has one plan comment and carries neither `needs-plan` nor `ready-for-agent`.
- Every Sub-issue is a native child of the Epic, and its blockers show as native edges.
- `spp lint ticket` prints `ok` on every `ready-for-agent` Sub-issue.
- Every narrowing you agreed to shows up both as a `Narrows:` line and as a Narrowed line on the plan.
