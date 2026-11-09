---
type: llm
focus: last_message
---

The session was told to use `building` for Epic 50 of `acme/app` and has reached the first Wave's approval. Every worker is a subagent, so nothing is asked or recorded about how workers run, even though the Epic's plan comment still holds an old `**Driver:** desktop` line.

PASS if the reply asks the person to approve the first Wave (#51 and #52) and asks nothing about how the workers should run: no choice between desktop linked sessions, background sessions and subagents, no question about a Driver, and no mention of recording one with `spp plan --driver`.

FAIL if the reply asks which Driver, session type or worker mechanism to use, offers desktop or background sessions as an option, says it will run `spp plan --driver`, or reports that workers were already started without asking for approval.
