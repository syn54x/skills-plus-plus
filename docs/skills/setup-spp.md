## What it does

`setup-spp` prepares one GitHub repository for the spp pipeline. It creates the labels the pipeline reads, writes the **Routing block** into `CLAUDE.md` or `AGENTS.md`, records where your glossary and ADRs live, checks your `gh` and Node versions, and asks whether you want ponytail. If the repo already has an Epic, it finishes by running `spp preflight` on it.

It changes only what is not already right, and it shows you every change before it writes anything. Run it a second time on a finished repo and it reports that nothing needs doing and writes nothing, so it is safe to use as a check.

## When to reach for it

You type `/setup-spp`; the agent never starts it on its own, and no other skill can start it for you. Run it in each repo that will use spp, ahead of its first `/to-spec` or `/build`. When `spp preflight` or a skill tells you there is no Routing block, this is the fix.

A repo set up earlier needs a run only when something in it should change: a new Panel threshold, a different feedback profile, a document to add to the Laws line, or labels someone deleted. `ask-spp` routes between every skill when the right one is unclear.

## What it writes

| Where | What | When |
| --- | --- | --- |
| GitHub labels | the five triage roles, `claimed`, `needs-plan`, `blocked`, `size:S`, `size:M`, `size:L`, `wayfinder:map` and the four `wayfinder:` types | each one only if the repo lacks it |
| Issue types, org repos only | `Epic` and `Task` | only the ones missing, and only after you agree, since they belong to the whole organization |
| `CLAUDE.md` or `AGENTS.md` | the Routing block between `<!-- sdd-routing -->` markers | created, or rewritten in place |
| the same file | a `## Domain docs` section naming the glossary and ADR locations | only when missing |

It writes to `CLAUDE.md` when that file exists, to `AGENTS.md` otherwise, and asks which to create when neither does. It creates no glossary or ADR file: `domain-modeling` does that when you settle a term or a decision.

## The Routing block

The block holds what `spp` and the skills need to know about this repo:

| Line | Meaning |
| --- | --- |
| `Mode` | `org` when the repo belongs to an organization, `labels-only` for a personal repo. Taken from the owner, never asked. |
| `Sizes` | the `size:S/M/L` labels |
| `Panel` | optional: thresholds that override when the review panel runs by itself (`tickets>=N`, `lines>=N`, and `no-size-L` to stop a size L Sub-issue from triggering it). Left out unless you ask for them. |
| `Merge` | optional: how `spp merge` merges a slice (`squash`, `merge` or `rebase`). Setup never asks for it, and a re-run keeps the line if you added it. |
| `Upstream feedback` | what `close-epic` may put in a skill-defect issue: `off`, `counts`, `detailed` or `attributed`. Each proposed issue is shown to you first. |
| `Laws` | the repo documents that bind every worker and reviewer |

The Laws line starts from whichever standard documents your repo has (`GLOSSARY.md`, `CLAUDE.md`, the ADR directory and a few more), and you can add others, such as a design system. On a re-run every entry already on the line stays.

## Common questions

**Does it install ponytail?**
Only if you say yes. It asks once, with one sentence on what ponytail changes, and it skips the question when ponytail is already available. Every spp skill runs unchanged without it.

**What does a second run do?**
It reads the repo again, compares, and reports `unchanged` for everything already in place. It keeps the answers already in your Routing block, so it asks nothing it has been told before.

**Why did it stop at the version check?**
`gh` older than 2.94 has no native sub-issues, blocked-by edges or issue types, which the pipeline depends on. Upgrade `gh` and run it again. An older Node only affects the `spp` tool, so the skill reports it and carries on with the labels and the block.

**It could not create the issue types.**
Types belong to the organization, and creating them needs admin rights there. Ask an admin to add `Epic` and `Task`; `/to-spec` files Epics with the first of them.

**Can I change a threshold by hand instead?**
Yes. The block is plain text in your instructions file, and `spp` reads it as it stands. Edit the line, keeping the field names and the markers as they are.

## It's working if

- `gh label list` shows every label in the table above.
- Your `CLAUDE.md` or `AGENTS.md` has one Routing block, with a `Mode`, a `Sizes` line and a `Laws` line.
- A second `/setup-spp` run reports that nothing needed changing.
- `spp preflight <epic>` on an Epic gets past its Routing block check.
- Ponytail was installed only because you said yes.
