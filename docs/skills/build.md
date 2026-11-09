## What it does

`build` is the command you type to build an Epic or a hardened One-off into pull requests. It hands the issue to [building](building.md), the skill that holds the build itself, and does nothing else: the Waves, the gates, the merges and the questions you are asked all come from `building`.

`/build <N>` and a session told "use building for #N" run the same build. `building` reads every decision from GitHub, so a build started either way can be resumed either way.

## When to reach for it

You type `/build <N>`; the agent never starts it on its own. Use it once the plan exists: an Epic that `/to-tickets` has broken into Sub-issues, or an issue that triage has hardened with the full Ticket contract. It is the build step of the Epic path and the single-issue path.

An agent cannot type `/build`, so an agent that starts a build, such as a Chief of Staff session, uses [building](building.md) directly. For work too small to file, skip spp and edit directly. [ask-spp](ask-spp.md) routes between every skill when the right one is unclear.

## Common questions

**Where did the build steps go?**
To [building](building.md), with its page. `/build` behaves as it did before: it calls `building` for the issue you named.

## It's working if

- `/build <N>` and "use building for #N" start the same build on N.
- Everything the run asks you, and everything it does, is described on the [building](building.md) page.
