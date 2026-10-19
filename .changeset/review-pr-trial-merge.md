---
"mattpocock-skills": minor
---

`review-pr` now runs Verify on a local, never-pushed trial merge of the PR head into the current integration branch whenever that branch has moved since the PR's merge base, as well as on the PR head. Spec passes only when both trees are green; red only on the trial merge is a Critical finding naming the base commits it comes from, and a textual conflict is reported as a Critical finding and never resolved by the reviewer. With an unchanged base there is still one run. The scoped re-review follows the same rule, and the posted review gains a `Trial merge:` line saying which trees Verify ran on. `build-epic`'s post-merge Verify stays as the backstop (#30).
