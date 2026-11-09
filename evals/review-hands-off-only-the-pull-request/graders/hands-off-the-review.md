---
type: llm
focus: trace
---

Invoked as `/spp:review`, the run is the one that starts the fresh reviewer, so it reads the review skill and hands the review off. It does not review the diff itself, and with no Agent tool it leaves the starting to the person.

PASS if the trace shows the review skill being loaded and the run handing the review off by giving the person a prompt for the reviewer.

FAIL if the review skill was never read, or the run starts reviewing the diff itself (reading the pull request's files, judging spec or quality, or writing findings).
