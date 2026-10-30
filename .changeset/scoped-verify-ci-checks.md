---
"mattpocock-skills": minor
---

Agents no longer run the full test suite in an SDD slice gate; it is CI's run, read by the gate. `to-tickets` scopes every Verify block's test command to the ticket's test paths or the repo's test-selection tool, and its Verify-resolves check fails a bare suite command and scopes it inline. `implement-issue` runs the working test file and the scoped Verify block, leaving the suite to CI on the PR head. `review-pr` reads `gh pr checks` with `review-panel`'s bucket semantics and reports a `Checks:` line: a failing check is a Critical Quality finding, and a pending one is waited for, then named on a `Pending check:` line for the orchestrator to re-read before merging. `build-epic` reads CI's run on the integration branch after each merge, and keeps one local full run only where no workflow has a push trigger for that branch.
