## What it does

`to-spec` writes the plan your conversation has settled as an Epic: one GitHub issue whose body is the spec, and which serves as the PRD for the feature. It reads the thread, the code the plan touches, your glossary and your ADRs, and files the issue with the glossary's words and the ADRs respected.

It writes from the conversation already held, and asks nothing new. The one exception is the test seams, which it shows you before it writes anything. The Epic records decisions you made; it is no place to make new ones, so a choice the plan needs and nobody made sends you back to `/grill`.

## When to reach for it

You type `/to-spec`; the agent never starts it on its own. Run it in the same conversation as the grilling, since the conversation is what it writes from.

Use it when the work is too large for one agent session and has to be split into Sub-issues. It is step two of the Epic path: grill, then `/to-spec`, then `/to-tickets`.

| Where you are | Run |
| --- | --- |
| Nothing is decided yet | [grill](grill.md) first |
| Decided, and one agent session can hold the whole build | Skip the Epic and file a One-off through triage |
| Decided, and the build needs several sessions | Write the Epic with `/to-spec`, then cut it with `/to-tickets` |
| A wayfinder map has reached a destination | `/to-spec` on the map |

`ask-spp` routes between every skill when the right one is unclear.

## Prerequisites

The repo needs a Routing block in `CLAUDE.md` or `AGENTS.md`, which `/setup-spp` writes. `to-spec` reads its Mode line: in `org` mode the Epic gets the Epic issue type, and in `labels-only` mode it gets the `ready-for-agent` label and nothing else. With no block, it asks you to run `/setup-spp` and stops.

## Seams before prose

A seam is a point where what runs can be swapped, and a test goes in through one. Before writing, `to-spec` proposes the points where tests will enter the code: an existing seam over a new one, the highest seam that can show the behaviour, and as few as it can manage. One is ideal. It lists each with what it covers and waits for you to confirm or change them.

The agreement is recorded in the Epic's Testing Decisions, and the workers who build the Sub-issues write their tests at those seams. A seam nobody agreed to surfaces later as a review finding, so this is the moment to push back.

## Common questions

**Why does the Epic carry `ready-for-agent`?**
The label means the issue needs no further triage. The Ready queue is made of Sub-issues, so the label on the Epic does not make `/build` treat it as a slice of work. `/build` on the Epic number builds its Sub-issues.

**Can I skip the Epic and cut Sub-issues straight from the grilling?**
Often you should, and a build that fits one session needs neither. The Epic pays for itself on larger work: Sub-issues are small and close as they land, and the Epic is what remains to explain why they were cut that way.

**What do I give it after a wayfinder map?**
The map itself. A map holds decisions spread over several issues; `to-spec` gathers them into one Epic that can be built from.

**Does a refactor fit the template?**
Partly. The User Stories section suits features and fits architectural work badly. Keep the stories few and honest, and lean on Implementation Decisions and Testing Decisions. A lasting architectural decision belongs in an ADR, which `/grill` offers when the decision clears its bar.

**The spec says something I never said.**
That counts as a defect. Edit the Epic to match what you decided, and treat the invented line as a sign that the grilling left a gap.

**Can I clear the conversation before running `/to-tickets`?**
Run `/to-tickets` in the same conversation. The Epic is on the tracker, but the conversation is the richer record of why each decision was made.

## It's working if

- It shows you the seams and waits, before any issue exists.
- It asks you nothing else.
- The Epic uses your glossary's terms and does not contradict an ADR.
- Every decision in it is one you remember making.
- Out of Scope lists the things you refused.
- It ends by giving you the issue link and asking you to run `/to-tickets`, rather than starting it.
