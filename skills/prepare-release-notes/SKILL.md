---
name: prepare-release-notes
description: Draft release highlights from the commits and pull requests since the latest tag, then print the repo's release command for you to run.
disable-model-invocation: true
---

Draft the highlights a person reads at the top of a release, in the repo's own voice, and hand over the command that cuts it. This skill writes a draft file and prints a command. The person runs the command; the skill ends when it is printed.

## 1. Gather the delta

Find the latest tag and list what landed after it: commits (merges excluded) and merged pull requests, with their titles, bodies and linked issues. The delta is complete when every commit since the tag is accounted for, either as a highlight candidate or as noise (chores, CI, dependency bumps) that the draft leaves out.

Check that the working tree is clean and that `HEAD` is on the branch the repo releases from. When either is off, tell the person and wait for an answer before drafting.

When the delta holds nothing a user can see, say so and stop. No draft is better than an invented one.

## 2. Read the release path from the repo

Find how this repo cuts a release by reading what it already declares, in this order:

1. The task runner (`justfile`, `Makefile`, `package.json` scripts): a `release` or `publish` target, and whether it takes notes as an argument.
2. Changesets (a `.changeset/` directory): the release is the merge of the version pull request, and the notes belong on the GitHub Release it produces.
3. The CI workflows (`.github/workflows/`): a release workflow, its trigger and the inputs it accepts.
4. `CONTRIBUTING.md`, `AGENTS.md` and `CLAUDE.md`: a written release procedure.

The command to print is one of these, quoted as the repo states it. When the repo declares no command that accepts notes, print the repo's real release step and the path of the draft, and name where the notes go (the release body, the version pull request). Name any flag only after finding it in the repo.

Read the voice from the last few published releases (`gh release list`, `gh release view <tag>`). Match their person, length, headings and whether they use emoji or other markers. A repo whose releases carry no markers gets none.

## 3. Draft the highlights

Call the Skill tool with "writing-for-humans" and draft with it in view. Release notes are explanation plus how-to.

- **Headline**: `## <the win in plain language>`, naming what a user can now do or what is now fixed.
- **Lead**: one to three sentences. For a feature, anchor on one concrete example the reader can paste.
- **Body**: short sections or tight prose, with links to the issues, pull requests and docs pages that carry the detail.
- **Also in this release**: a short list for secondary items, when there are any.
- **What's next**: only when earlier releases set that expectation and a real follow-up exists.

Scale the draft to the delta:

| Delta | Highlights |
| --- | --- |
| One fix or a small patch | Headline, one paragraph, the issue or pull request link |
| One feature | Headline, lead, how it works, docs link |
| Several features | Headline, lead, two to four sections, then Also in this release |

Write highlights only. The release tooling adds the version heading and the generated changelog, and the repo's `CHANGELOG.md` stays as it is.

## 4. Write the draft and print the command

Write the draft to `<repo name>-release-notes.md` in the session's scratchpad directory, or in the system temp directory when the environment names no scratchpad. A path the person names wins. Replace the file when it exists. Show the draft, or its path, so the person can edit it before releasing.

Then print the release command from step 2 with the draft's path filled in, in a fenced block, and end with one line: you run it, I do not. When the repo offers a prerelease variant, print that command beside it.

## Done when

- Every commit since the latest tag is in a highlight or was dropped as noise.
- The draft file exists at the printed path.
- The printed command is one the repo itself declares, and nothing has been run.
