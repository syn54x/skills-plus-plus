## What it does

`to-tickets` breaks an Epic into Sub-issues on GitHub: vertical slices, each with native blocked-by edges and a parent link to the Epic, each carrying the Ticket contract, and one plan comment pinned on the Epic that shows them in layers.

It decides the breakdown and leaves the contents to [harden](harden.md). `to-tickets` chooses the slices and their edges, has you approve them, and publishes them; then it calls `harden` once per Sub-issue to write the contract from the code. What it adds on top is the work no single issue can see: two Sub-issues that would edit the same file at once, a name one issue consumes that no blocker produces, and a Sub-issue that silently promises less than the Epic.

## When to reach for it

You type `/to-tickets <epic>`; the agent never starts it on its own. It is the third step of the Epic path: grill, to-spec, then `to-tickets`, then `/build <epic>`. Run it in the same conversation as to-spec when you can, so the reasoning behind the Epic is still in view.

| Your situation | Use |
| --- | --- |
| A written Epic needs splitting into buildable work | `/to-tickets <epic>` |
| The plan is not settled yet | [grill](grill.md), then to-spec |
| One filed issue needs to become buildable | triage, which calls [harden](harden.md) once |
| One pull request holds the whole change | no Epic: triage it as a One-off |

`ask-spp` routes between every skill when the right one is unclear.

## Prerequisites

The repo needs a Routing block in its `CLAUDE.md` or `AGENTS.md`, which `/setup-spp` writes. `to-tickets` reads its Mode, Sizes and Laws lines, and stops without one.

## Tracer bullets

Each slice is a *tracer bullet*: a thin path through every layer it needs, which works and can be shown on its own once it merges. A slice per layer (all the schema, then all the API, then all the screens) is what it avoids, because nothing in such a slice works until the others land and its tests grade code another worker owns.

The one exception is a wide refactor, a mechanical change that breaks callers everywhere at once. That is sequenced as expand, migrate in batches, then contract, so the build stays green between batches.

## From approval to plan

1. You approve a numbered list of slices, with their blockers and what each lets you demo.
2. The Epic gets `needs-plan`, so the Epic itself is never picked up as work.
3. Sub-issues are created blockers first, with native parent and blocked-by edges.
4. `harden` writes each contract and its size.
5. The cross-issue checks run: file collisions, Consumes against Produces, narrowing against the Epic.
6. Clean Sub-issues get `ready-for-agent`, `spp plan` pins the plan, and `needs-plan` comes off.

## Common questions

**It produced a dozen Sub-issues for a small change.**
The model tends toward small atomic units. Push back at the quiz and ask it to merge; nothing is published until you approve. When one pull request can hold all of it, skip the Epic.

**The slices came out one per layer.**
Ask of each slice what you could demo once it merges. A slice with no answer is a layer, not a tracer bullet, and should be merged into the slices that use it.

**What does a `Narrows:` line mean?**
That Sub-issue promises less than the Epic, and you agreed to it. Without the line, the final review reports the gap as a defect. With it, the plan comment carries the same words on a Narrowed line, and reviewers read it as accepted scope. A narrowing that nobody chose is widened instead of recorded.

**A worker had to touch a file outside its Files owned.**
The contract was drafted from the Epic's wording, not from the repository: a missed caller, a fixture pinning old output, or a placement an ADR dictates. Those are the code checks `harden` runs; see [its page](harden.md) for each.

**Why are the Sub-issues created before they are hardened?**
`harden` writes into an issue and `spp lint ticket` reads one, so each Sub-issue has to exist first. It gets no `ready-for-agent` label until every check has passed, so no worker can claim it half-written.

## It's working if

- Every Sub-issue answers "what can I demo once this merges?" with something a user could see.
- The Epic carries a single plan comment, and no longer has `needs-plan` or `ready-for-agent`.
- Each Sub-issue is a native child of the Epic, and its blockers show as native edges.
- `spp lint ticket` prints `ok` on every `ready-for-agent` Sub-issue.
- Every narrowing you agreed to appears both as a `Narrows:` line on its Sub-issue and as a Narrowed line on the plan.
