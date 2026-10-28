---
"mattpocock-skills": minor
---

The cloud path through the SDD skills is removed. Every ticket, a One-off at any size included, is now built locally with `/build-epic` or `/implement`. The pack no longer ships `claude-code-action` workflows, and the skills no longer carry a branch for running under them. Why, and four lessons for anyone who writes their own workflow, are in `.out-of-scope/cloud-workflow-templates.md`.

Breaking for anyone who used the old pieces:

- The `sdd-implement.yml` and `sdd-review.yml` workflow templates are gone.
- `setup-syn54x-skills` no longer offers to install them.
- `implement-issue` and `review-pr` no longer have a cloud route: no `GITHUB_ACTIONS` check, no run-URL Worker line, no cloud review routing.
- The sizing rule that made a One-off touching `.github/workflows/` at least `size:M` is gone from `to-tickets` and `triage`.

A workflow you already copied into your repo goes on working as it is; setup never deletes it. It now calls skills that no longer know they are running in the cloud, so it is yours to maintain.
