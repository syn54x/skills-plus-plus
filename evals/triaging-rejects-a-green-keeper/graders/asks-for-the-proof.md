---
type: llm
focus: last_message
---

For issue 71 nothing has been run, and the session has no shell. The triaging skill's `PRUNING.md` says a Keeper is never called proven from reading alone: the person is asked to run the scratch-copy commands and paste what they print, and the message opens with the waiting line `#71 waits on you:`.

PASS if, for the first case, the reply asks the person to run the proof (a scratch copy of the default branch made with `git worktree add --detach`, the Keeper run alone before any break, then the break made in the scratch copy and the Keeper run again) and paste the output, and does not give an outcome for #71 from reading alone.

FAIL if the first case ends in any outcome or role for #71 reached without a run, or asks nothing of the person, or asks the person to make the break in their own checkout.
