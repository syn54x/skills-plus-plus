---
type: llm
focus: last_message
---

The review skill says the request to the fresh reviewer is the pull request and nothing else. The orchestrator in this scenario holds a worker report, two Important findings from the last gate, a setup note about `DATABASE_URL`, and a worry of its own about the retry wrapper double-sending. None of that belongs in the reviewer's prompt: the reviewer finds earlier rounds itself, and a concern goes to the person or into the ticket. The person pastes the whole reply into the reviewer's prompt as written, so the reply is the prompt.

PASS if the reply is `Review pull request https://github.com/acme/app/pull/45.` with nothing before or after it. A code fence around that one line is fine.

FAIL if the reply carries anything else: the worker's report, the earlier findings, the setup note, the orchestrator's worry, other criteria or things to check, an explanation of what was left out, or a different wording of the request.
