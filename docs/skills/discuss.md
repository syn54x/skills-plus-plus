> **Experimental.** `discuss` may change or be removed in a later release.

## What it does

`discuss` talks a vague idea over with you before it is a plan. The agent first reads the code, the glossary, the ADRs and the issues your idea touches, then brings you material to react to: a bolder version of the idea, an objection that could break it, what already exists, and the smallest version worth building.

It settles nothing. A reply holds at most one question, asked only when your answer would change where the talk goes, so you are never handed a list of decisions. The session ends with a short restatement that names where the idea should go next, and the agent leaves that next step to you.

## When to reach for it

Type `/discuss` followed by the idea (`/discuss riders lending a booked bike to a friend`), or type it alone to take up the idea already under discussion. The agent also starts it when you say you want to brainstorm, discuss, explore or kick an idea around, or that you are not ready to plan yet.

Use it while you cannot yet say what you would build.

| Your situation | Use |
| --- | --- |
| An idea you cannot yet state as a plan | `discuss` |
| A plan whose choices need settling | [grill](grill.md) |
| A destination too far off for one sitting | [wayfinder](wayfinder.md) |
| A fact from outside the repo that a decision waits on | [research](research.md) |

`discuss` is an optional step before the Epic path and before unknown territory. It is not a path of its own, because a discussion may end in nothing. [ask-spp](ask-spp.md) routes between every skill when the right one is unclear.

## The four moves

A session is built from four *moves*, made in whatever order the talk calls for. Here they are for the idea of riders lending a booked bike to a friend:

| Move | What the agent brings | For the bike idea |
| --- | --- | --- |
| Widen | A far-out version of the idea | Any rider can pass any booking to anyone, and bookings become tradeable |
| Test | An objection or boundary case that would break it | The friend crashes the bike: who pays? |
| Survey | What exists today, in the repo and outside it | Your booking model has one rider per booking; two other bike-share apps offer guest passes |
| Shrink | The smallest version that still matters, including doing nothing | A rider adds one named guest to one booking |

You can wave a move off ("skip the far-out version"), and you can close the session whenever you like. The agent offers to close only once each move has been made or waved off, so every session covers the same ground.

For the part of Survey that lies outside your repo, the agent starts [research](research.md), which reads in the background while the talk carries on.

## The closing restatement

A session ends with a restatement in five parts, always in this order:

| Part | What it holds |
| --- | --- |
| The idea now | The idea as it stands, in two or three sentences |
| Ruled out | Each direction that was dropped, with its reason in one line |
| Still open | The choices nobody made |
| Already exists | The prior art, with the path of the research note |
| Suggested route | One next step, and the fact that picks it |

The agent names one of five routes and starts none of them:

| Suggested route | The fact that picks it |
| --- | --- |
| `/grill` or `/auto-grill` | One sitting can settle every decision |
| `/wayfinder` | One sitting cannot |
| [prototype](prototype.md) | Talk has not settled a design question |
| Park | The idea is worth keeping, and its time is not now |
| Drop | The idea is not worth the work |

Run `/grill` in the same conversation and the interview starts from the restatement, so nothing ruled out is argued again.

A session writes no file, no glossary term and no ADR. The one exception is a parked idea: the agent offers to file the restatement as one issue, and files it only when you say yes. That issue opens with a line saying an AI wrote it and carries no Triage role, so [triage](triage.md) finds it in its queue.

## It's working if

- The first reply already knows your repo, and never asks you for a fact it could have looked up.
- Every reply gives you something to react to, with one question at most and no numbered list of decisions.
- By the time the agent offers to close, you have seen all four moves or waved off the ones you skipped.
- The session ends with the five-part restatement and one suggested route, and no other skill started apart from research in the background.
- No file, glossary term or ADR changed. The only thing left behind is the issue for a parked idea, filed after your yes.
