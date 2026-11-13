> **Experimental.** `chief-of-staff` may change or be removed without a deprecation period.

## What it does

`chief-of-staff` turns the session you are in into your **Proxy** for the goals you give it, across every repo under the folder you started in. It holds the picture of what is in flight, follows stalled work through, settles the questions the record already answers, and reports where each goal stands.

It acts on its own and brings you only three things: an **Escalation** with its **Best fit**, a **Challenge**, and a veto list of the answers it gave in your name. Every report ends with that list. Merging to a protected branch, releasing and closing an **Epic** are the exceptions: each needs your word every time, and one approval never covers the next.

## When to reach for it

You type `/chief-of-staff`, with a goal or without one; the agent never starts it on its own. Add goals along the way. It belongs to no path: it is a session role beside the Build session, and the paths are some of its tools. `ask-spp` routes between every skill when the right one is unclear ([ask-spp](ask-spp.md)).

| You want | Use |
| --- | --- |
| One interview where the record settles what it can | [auto-grill](auto-grill.md) |
| One Epic built into pull requests | [build](build.md) |
| Several goals followed through, across repos, over days | `/chief-of-staff` |

## How it sends work out

It keeps its own context for following goals, so it starts other sessions to do the work. To build an Epic or a One-off it starts a separate session in that issue's checkout, told `Use building for <issue URL>.` To triage a filed issue it starts one session per issue, told `Use triaging for <issue URL>.` Research and other work runs in background subagents.

When one of those sessions stops with `#<N> waits on you: <question>`, the Chief of Staff answers as your Proxy if a source settles it, and lists the answer in the veto list. If the question touches the gate, or nothing settles it, it asks you and sends your words back unchanged.

It starts only skills the agent may run on its own. For `/auto-grill`, `/to-spec`, `/to-tickets`, `/retro` and `/close-epic` it asks you to type the command. In a repo without spp it works with plain subagents and pull requests and mentions `/setup-spp` once. Where it can, it suggests schedules, such as a report or a sweep of stalled work. On Claude Code a session can start only on a turn you began, so on a scheduled wake-up it proposes the build and waits for you.

## The environment duty

Before any piece of work, the session asks how the agents' environment could be better for it: interfaces hard to misuse, lint rules that force correctness, standards a reviewer can enforce, data sources such as logs, a test database or a browser, and no workarounds. It opens a pull request for each improvement, so the next task starts from a better place.

## Common questions

**What does it do without asking me?**
Everything except the gate: merging to an unprotected branch, filing issues and opening pull requests all happen on its own and show up in the next report.

**What does it ask me every time?**
Three things: merging to a protected branch, releasing, and closing an Epic.

**How do I overrule an answer it gave?**
The veto list at the end of each report names the answer and its source. Say which one you overrule.

## It's working if

- Each answer it settled names the file or record it came from.
- A question it could not settle reaches you as an Escalation with a Best fit.
- Every report ends with a veto list, even an empty one.
- It stops and asks before a protected merge, a release or closing an Epic.
