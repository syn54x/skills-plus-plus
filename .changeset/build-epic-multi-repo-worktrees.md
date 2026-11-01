---
"mattpocock-skills": patch
---

`build-epic` in multi-repo mode no longer guesses where the other repos live or switches their branches. It asks once per session for each other repo's checkout path, creates that repo's integration branch in a dedicated worktree of the checkout (reusing one an earlier session left), runs its local Verify and full-suite runs there, and removes the worktree once that repo's PR to `main` merges. Local paths never go to GitHub.
