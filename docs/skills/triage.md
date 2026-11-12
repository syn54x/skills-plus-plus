## What it does

`triage` is the command you type to move a filed bug or enhancement to one Triage role, hardened and sized when it is ready to build. It does two things itself: it helps you pick the issue, and it decides where the triage runs. The triage itself, from the four questions to the comment on the issue, comes from [triaging](triaging.md).

| What you type | What happens |
| --- | --- |
| `/triage` | A table of the issues waiting on you, longest wait first, and you pick one. |
| `/triage <N>` | Issue N goes straight on to the next row. |

Once there is one issue, `triage` hands it to [delegating](delegating.md), which chooses where `triaging` runs:

| Where you type it | What happens |
| --- | --- |
| A terminal, or anywhere a session cannot be started | No question. The triage runs here. |
| The desktop app | One question first: here or sub-session, with a recommendation. |

## When to reach for it

You type `/triage`, with an issue number or with nothing to see what needs attention; the agent never starts it on its own. It is step one of the single-issue path: triage, then `/build <N>`. Point `/build` at an issue with no contract and it sends you here.

An agent cannot type `/triage`, so an agent that triages, such as a Chief of Staff session sending out one session per filed issue, uses [triaging](triaging.md) directly. [ask-spp](ask-spp.md) routes between every skill when the right one is unclear.

## Prerequisites

The repo needs the five state labels, which `/setup-spp` creates. Without them, the triage asks you to run it and stops.

## Common questions

**Where did the triage steps go?**
To [triaging](triaging.md), with its page. `/triage <N>` and a session told "use triaging for #N" run the same triage.

**Which issues does the table show?**
An open issue with no Triage role (or `needs-triage`) that is not already past triage, and a `needs-info` issue whose newest comment is the reporter's reply rather than a triage note.

**Will the sub-session ask me again where to run?**
No. Its prompt tells it to use `triaging`, which never asks where to run. Its questions open with `#<N> waits on you:`, so you can answer a short one from here.

## It's working if

- `/triage` with no number shows a table and waits for your pick.
- In a terminal, `/triage <N>` starts triaging without a question about where.
- In the desktop app, the first thing `/triage <N>` asks is here or sub-session.
- Everything the triage asks after that, and everything it does, is described on the [triaging](triaging.md) page.
