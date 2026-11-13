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
