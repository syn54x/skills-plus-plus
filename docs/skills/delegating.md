## What it does

`delegating` decides where one issue's work runs: in this session, or in a sub-session it starts in the issue's checkout. `/build 340` uses it to run [building](building.md) for #340, and triage will use it the same way.

It asks only where the answer can matter. In a terminal, where no session can be started, it asks nothing and runs the skill here. In the desktop app it asks one question, here or sub-session, with one recommendation. Before either, `/build` reads the issue's kind: a Sub-issue or a raw issue stops right there with the reason (build its Epic, or run `/triage`), so no question is asked and no sub-session starts for an issue that cannot be built. Once a sub-session is running, `delegating` hands it the issue and steps aside: the sub-session runs the skill directly and never asks where to run again.

## When to reach for it

Type `/delegating`, or the agent starts it when an entry skill hands off an issue; in practice `/build` starts it for you. It belongs to the build step of the Epic path and the single-issue path. [ask-spp](ask-spp.md) routes between every skill when the right one is unclear.

## Here or sub-session

The recommendation follows from two facts about the session you typed in:

| This session | Recommended |
| --- | --- |
| Has already started other sessions, or its folder is not a checkout of the issue's repository | Sub-session |
| Neither | Here |

A session that has started others is acting as an orchestrator, such as a Chief of Staff session, and a long build would crowd it. A session outside the checkout cannot start workers at all, since each worker cuts its worktree from the checkout.

## Finding the checkout

When you choose a sub-session, `delegating` needs a folder that is a checkout of the issue's repository:

| Where this session stands | Where the sub-session starts |
| --- | --- |
| In a checkout of the issue's repository | This folder |
| In a folder with exactly one checkout of it one level down, matched by git remote | That checkout |
| In a folder with none, or several | You are asked which folder, and nothing starts until you answer |

The sub-session runs in that folder as it is, with no worktree of its own, on this session's model. Its prompt tells it to use `building` (or the skill handed over) for the issue.

## Common questions

**The build's question arrived in my main session. Can I answer it there?**
Yes. A sub-session's turn-end note reaches the session that started it, and every message in which `building` waits on you opens with one line in the same shape, such as "#340 waits on you: start Wave 1 with these 3 issues? Reply yes, or say what to change." Answer it where you are: `delegating` sends your words to the sub-session unchanged, quoted as yours, and adds nothing of its own.

## It's working if

- In a terminal, `/build <N>` starts building without asking where.
- In the desktop app, the first thing `/build <N>` asks is here or sub-session, with one recommendation.
- `/build` on a Sub-issue or a raw issue tells you why it stops, and asks nothing about where to run.
- A sub-session starts in the issue's checkout, and never in a folder you did not confirm when there was more than one.
- An answer you give in the parent shows up in the sub-session as your own words.
