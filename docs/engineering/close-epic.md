## What it does

`close-epic` closes an SDD epic once every sub-issue is closed and its PR to `main` has merged. It posts one summary comment with the ticket-to-PR table, computes a **retro** from GitHub state alone (tickets by size, escalations, blocking edges added mid-build, fix rounds, Verify blocks that had to be corrected, panel findings), tags each learning as `[repo]`, `[reusable]` or `[skill]`, and closes the epic.

With your consent, and only then, a `[skill]` learning can become a `skill-feedback` issue on `syn54x/skills-plus-plus` so the skills themselves improve. Those issues are built from a fixed allowlist of counts and categories, previewed one by one, checked by a guard script, and never filed from a non-interactive run.

## When to reach for it

Type `/close-epic <epic#>`, or the agent reaches for it when an epic is ready to wrap up. [build-epic](../engineering/build-epic.md) calls it once you have merged the PR to `main`; it works from GitHub state alone, so it can run in any later session too. `--dry-run` computes everything and posts nothing.

## Prerequisites

Every sub-issue closed and the integration-branch PR merged to `main`, in every repo of a multi-repo epic. If either is not true it stops, and the default answer to "close anyway?" is no.

Upstream feedback is off unless the repo's routing block says `Upstream feedback: on`, which [setup-syn54x-skills](../engineering/setup-syn54x-skills.md) asks about.

## Common questions

**What leaves my repo?** Nothing, unless feedback is on and you approve each issue. The retro comment stays on your epic. A feedback issue carries the skill and step, a category from a closed list, the retro counts, the harness and `gh` versions, and one sentence you type; never a repo name, URL, title, path or code.

## It's working if

- The epic has one `<!-- sdd-summary -->` and one `<!-- sdd-retro -->` comment, and every `[skill]` learning has a number behind it.
- It refused to close while a sub-issue or the PR to `main` was still open.
- No feedback issue appeared without you seeing its full body first.

## Where it fits

`close-epic` is the **last step** of the SDD chain, after [review-panel](../engineering/review-panel.md) and your merge to `main`. [ask-syn54x](../engineering/ask-syn54x.md) routes the whole set.
