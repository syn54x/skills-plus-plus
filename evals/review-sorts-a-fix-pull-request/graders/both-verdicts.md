---
type: llm
focus: last_message
---

The pull request has no closing line but opens `Refs #41`, issue 41 is a Sub-issue, and the base is its Epic's integration branch. That shape is a fix, and a fix gets both verdicts.

PASS if the reply sorts it as a fix (or a slice-like run) that gets both a spec verdict and a quality verdict.

FAIL if the reply sorts it as quality only, says there is no linked issue, or says no spec verdict is given.
