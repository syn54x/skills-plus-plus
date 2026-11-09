---
name: build
description: Build an Epic or a hardened One-off into pull requests, with workers in parallel worktrees behind a review gate.
disable-model-invocation: true
---

Build the issue the person named after `/build`: an Epic's number, a hardened One-off's, or either one's URL.

Call the Skill tool with "delegating" for `building` #<N>, where N is that issue, and follow it to the end of the run. Do nothing else here: `delegating` chooses where the build runs, and every build step lives in `building`.
