---
"mattpocock-skills": patch
---

`implement-issue` writes the PR body to a per-run `mktemp` file instead of a fixed path, so parallel workers never open a PR with each other's body.
