## What it does

`build` is the command you type to build an Epic or a hardened One-off into pull requests. Its one decision is where the build runs: here, or in a sub-session. It hands that choice to [delegating](delegating.md), and the build itself to [building](building.md): the Waves, the gates, the merges and the questions about them all come from `building`.

| Where you type `/build <N>` | What happens |
| --- | --- |
| A terminal, or anywhere a session cannot be started | No question. The build runs here. |
| The desktop app | One question first: here or sub-session, with a recommendation. |

The sub-session is recommended when this session has already started other sessions, or when its folder is not a checkout of N's repository. Choose it and the build runs in a session of its own, in N's checkout, while this one stays free. [delegating](delegating.md) explains how the checkout is found and how your answers reach the sub-session.

## When to reach for it

You type `/build <N>`; the agent never starts it on its own. Use it once the plan exists: an Epic that `/to-tickets` has broken into Sub-issues, or an issue that triage has hardened with the full Ticket contract. It is the build step of the Epic path and the single-issue path.

An agent cannot type `/build`, so an agent that starts a build, such as a Chief of Staff session, uses [building](building.md) directly. For work too small to file, skip spp and edit directly. [ask-spp](ask-spp.md) routes between every skill when the right one is unclear.

## Common questions

**Where did the build steps go?**
To [building](building.md), with its page. `/build` and a session told "use building for #N" run the same build, and `building` reads every decision from GitHub, so a build started either way can be resumed either way.

**Will the sub-session ask me again where to run?**
No. Its prompt tells it to use `building`, which never asks where to run.

## It's working if

- In a terminal, `/build <N>` starts building without a question about where.
- In the desktop app, the first thing `/build <N>` asks is here or sub-session.
- Everything the build asks after that, and everything it does, is described on the [building](building.md) page.
