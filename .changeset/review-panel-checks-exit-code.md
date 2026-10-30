---
"mattpocock-skills": patch
---

`review-panel` reads a pending check from `gh pr checks`'s `bucket` field, not from its exit code: under `--json` a pending check exits 0, so the old "exit 8 means pending" sentence was wrong. The wording now matches `review-pr`.
