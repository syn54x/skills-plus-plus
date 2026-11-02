## What it does

`prepare-release-notes` drafts the highlights that sit at the top of a release, from the commits and merged pull requests since the latest tag, and prints the command that cuts the release. It writes the draft to a file in the session's scratchpad directory, shows it to you, and stops there.

It reads everything repo-specific from the repo. The release command comes from the task runner (a `justfile`, a `Makefile`, `package.json` scripts), from Changesets, or from the CI workflows. The voice comes from your last few published releases. The skill never runs the release command: you read the draft, edit it, and run the printed command yourself.

## When to reach for it

You type `/prepare-release-notes`; the agent never starts it on its own. Use it when a release is close and the highlights are not written yet. It belongs to the ship flow, after the work has merged. `ask-spp` routes between every skill when the right one is unclear.

The agent calls [writing-for-humans](writing-for-humans.md) before it drafts, because release notes are prose a person reads. For a pull request body the `pr` skill applies instead.

## Common questions

**Does it ever run the release?**
No. It prints the command with the draft's path filled in, and you run it. A skill that cuts releases on its own would turn a draft you wanted to edit into a published release.

**My repo has no release command that takes notes. What does it print?**
The repo's real release step, the path of the draft, and where the notes go, such as the release body or the version pull request. It names a flag only after finding it in your repo.

**Will it edit `CHANGELOG.md`?**
No. It writes highlights only. The version heading and the generated changelog come from your release tooling.

**What if nothing user-facing landed since the tag?**
It says so and stops. Chores, CI changes and dependency bumps are dropped from the draft unless they are the whole release.

**Where does the draft go?**
To `<repo name>-release-notes.md` in the session's scratchpad directory. Name another path and it uses yours.

## It's working if

- The draft opens with a headline naming what users can now do or what is fixed.
- Its length matches the release: a paragraph for a patch, a few sections for a milestone.
- It reads like your last published releases, including whether they use emoji.
- The command it printed is one your repo declares, and nothing was released.
