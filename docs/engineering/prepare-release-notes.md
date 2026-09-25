## What it does

`prepare-release-notes` drafts the human-written **highlights** for a GitHub Release from the commits and merged PRs since the last tag, writes them to a temp markdown file, and prints the command that cuts the release. It never runs that command, never edits a generated `CHANGELOG.md`, and leaves the auto-generated changelog section to the release tooling.

The highlights are written like a short blog post in the repo's own voice, matched against its recent releases, rather than as a list of commit subjects.

## When to reach for it

Type `/prepare-release-notes`, or the agent reaches for it when you are preparing or cutting a release, drafting release notes, or ask for release highlights.

## Common questions

**Why won't it just cut the release?** Releasing is a one-way door. The skill stops at the file and the printed command so a human decides when it ships.

**My release command takes no notes argument.** It still drafts the highlights and prints the project's release command, plus where to paste the notes; it does not invent a flag.

## It's working if

- A notes file exists under `/tmp` and the terminal shows the exact release command, unrun.
- Chore and CI noise is gone unless it was the whole release.

## Where it fits

`prepare-release-notes` is a **reach-for-it-anytime standalone** at release time. [ask-syn54x](../engineering/ask-syn54x.md) routes the whole set.
