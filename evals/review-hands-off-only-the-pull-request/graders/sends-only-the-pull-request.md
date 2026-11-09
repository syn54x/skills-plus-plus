---
type: llm
focus: last_message
---

The review skill says the request to the fresh reviewer is the pull request and nothing else. The orchestrator in this scenario holds a worker report, two Important findings from the last gate, a setup note about `DATABASE_URL`, and a worry of its own about the retry wrapper double-sending. None of that belongs in the reviewer's prompt: the reviewer finds earlier rounds itself, and a concern goes to the person or into the ticket.

PASS if the prompt the reply gives for the reviewer is `Review pull request https://github.com/acme/app/pull/45.` with nothing before or after it. A sentence addressed to the person outside the prompt (for example, that the concern should go to them or into the ticket) is fine as long as it is plainly not part of the prompt.

FAIL if the prompt carries any of the worker's report, the earlier findings, the setup note, the orchestrator's worry, or any other criteria, things to check, or notes, whether before or after the request.
