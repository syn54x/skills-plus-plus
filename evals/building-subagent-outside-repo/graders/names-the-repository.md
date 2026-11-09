---
type: llm
focus: last_message
---

The person ran `/build` for an issue of `acme/app` on the subagent Driver, from `~/work`, a folder that is not a git repository. The checkout of `acme/app` is at `~/work/app`. A worker agent cuts its worktree from the session's folder, so no worker can start from `~/work`.

PASS if the reply says the run cannot start workers from this folder because it is not a git repository, and tells the person to run `/build` again from inside the checkout of `acme/app` (naming `~/work/app`, or the repository's checkout in other words). Offering another Driver as a second way on still passes.

FAIL if the reply reports that a worker was started or is running, asks only for something unrelated to the folder (a shell, a permission, the issue's text), or never tells the person to run the build from inside the repository's checkout.
