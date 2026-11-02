## What it does

`to-spec` files the plan you have just worked out as an Epic, a single GitHub issue that holds the spec and doubles as the PRD. The agent reads the conversation, the code the plan touches, your glossary and your ADRs, writes the Epic in the glossary's words, and publishes it with the `ready-for-agent` label.

It adds no questions of its own to the conversation you already had, with one deliberate exception, the test seams, which it puts to you before anything is published. Everything else in the Epic comes from what was said or what the repo shows. If the plan depends on a choice nobody made, `to-spec` stops and sends you back to `/grill` instead of making the choice for you.

## When to reach for it

You type `/to-spec`; the agent never starts it on its own. Type it in the conversation where you did the grilling, because that conversation is its source.

Reach for it when:

- the plan has been grilled until no open choice is left;
- building it will take several agent sessions, so it has to be cut into Sub-issues;
- you want the reasoning kept somewhere that outlives this conversation.

Hold off when the plan is still loose (run [grill](grill.md) first) or small enough for one session (file a One-off through triage instead). A finished wayfinder map also counts as a plan to write up. After `/to-spec` comes `/to-tickets`, which cuts the Epic into Sub-issues. `ask-spp` routes between every skill when the right one is unclear.

## Prerequisites

The repo needs the Routing block in its `CLAUDE.md` or `AGENTS.md`, which `/setup-spp` writes. `to-spec` reads the block's Mode line to decide how to file the Epic:

| Mode | What the Epic gets |
| --- | --- |
| `org` | the Epic issue type and the `ready-for-agent` label |
| `labels-only` | the `ready-for-agent` label only, since personal repos have no issue types |

With no block, it asks you to run `/setup-spp` and stops. If the organisation has no Epic type yet, creating the issue fails and it asks for the same.

## The one question: where do tests connect?

Before writing, the agent works out the seams for the feature: the places where a test can connect to the code and see behaviour. Take a feature that makes an invoice importer reject duplicate references. The importer could be tested through a parser function, a validator and a repository call, three seams that each bind a test to internals. It could also be tested once, by running the import command on a small file and reading the result, which is one seam covering all three.

The agent lists the seams it recommends, says what each shows, and waits. You confirm or change the list, and the Epic's Testing Decisions section records your answer. Workers building the Sub-issues later write their tests at those seams, so a bad seam costs more here than anywhere else.

## Common questions

**It stopped and told me to run `/grill`.**
The plan needs a choice that nobody made, and the Epic is meant to record decisions, not create them. Settle the choice in the conversation, then run `/to-spec` again.

**Does the label make the Epic look like work to claim?**
No. In 1.x the label did make the Epic itself look claimable. The Ready queue is now computed over Sub-issues, so `ready-for-agent` on the Epic only says that it needs no triage.

**Is a spec file written to the repo?**
No. The Epic lives on the issue tracker and nowhere else, and the repo never gains a plan file.

**I disagree with a line in the Epic.**
Edit the issue; it is an ordinary issue body. If the line states something you never said, treat it as a defect: the skill filled a gap instead of leaving it open.

**My change is a refactor, so the User Stories feel forced.**
Write the few stories that are true and put the weight on Implementation Decisions and Testing Decisions. A decision that will outlive the work belongs in an ADR, which `/grill` offers.

## It's working if

- The only question it asks is about seams, and no issue exists until you answer.
- The Epic contains nothing you do not remember deciding.
- Its wording matches your glossary, and no ADR is contradicted.
- Out of Scope names the things you turned down.
- It finishes with the issue link and a request to run `/to-tickets`, and starts no further step itself.
