# Cloud Workflow Templates

This project will not ship `claude-code-action` workflow templates, or a cloud route through the SDD skills.

## Why this is out of scope

The pack used to ship two GitHub Actions templates, `sdd-implement.yml` and `sdd-review.yml`, which `setup-syn54x-skills` copied into a repo so that labelling a `size:S` One-off started a cloud worker and a cloud reviewer. `implement-issue` and `review-pr` each carried a cloud branch for those runs. All of that is removed.

[`SCOPE.md`](../SCOPE.md) rules out a harness-specific branch, and the cloud path was one: it ran the skills under a single harness, with its own branch rules, its own Worker line and its own review route. The maintenance record bears that out. Six of the twelve commits before this decision were fixes that only the cloud path needed, and the open issues it left behind (#110, #119, #122) asked for more of the same.

You can still run the skills in the cloud. A workflow of about forty lines that installs your toolchain and calls `/implement-issue` on a labelled issue does the job, and you own it. It is unsupported: the skills make no promise about how they behave under it.

If you write one, these are the four things the old templates learned the hard way:

1. **The action creates its own branch.** `claude-code-action` checks out a fresh branch before the skill runs, so the worker must build on that branch rather than cut another one.
2. **The worker is a bot.** The PR it opens is authored by the action's bot account, so any review gate that skips bot PRs must allow this one.
3. **The token cannot push workflow files.** The default `GITHUB_TOKEN` is refused on any change under `.github/workflows/`, so a ticket that touches those files cannot be built in the cloud.
4. **The runner lacks your toolchain.** A hosted runner has none of the repo's tools unless the workflow installs them, so a ticket's Verify block fails or runs half its commands.

## Prior requests

- #66: Cloud agents build only one-off size:S tickets outside an epic; build-epic is always local
- #82: triage hardens and sizes a one-off ticket on an SDD repo, so the cloud path has a producer
- #95: Cloud guard fires on either trigger label and skips a held issue
- #110: Cloud workers need a stable Worker-line name so a cloud fix round can resume
- #112: sdd-review.yml runs only on pull requests the cloud worker opened
- #115: setup-syn54x-skills: the sdd-implement and sdd-review templates grant no Bash, so a cloud worker is denied gh/git/pnpm and quits in 4 turns
- #117: chore(ci): show the SDK output in this repo's sdd-implement runs
- #118: The cloud path cannot deliver a ticket whose Files owned touches .github/workflows; triage must size it off the cloud
- #119: The cloud runner lacks the repo's toolchain, so a ticket's Verify block cannot fully run in sdd-implement.yml
- #122: Cloud review-pr posts verdicts only: it does not route the ticket, update the progress comment, or post as a PR review; the cloud worker's Worker line is not the run URL
