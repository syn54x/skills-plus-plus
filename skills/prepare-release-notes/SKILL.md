---
name: prepare-release-notes
description: Draft release highlights from the commits and pull requests since the latest tag, then print the repo's release command for you to run.
disable-model-invocation: true
---

Turn what shipped since the last tag into highlights a reader wants to read, in the repo's own voice, and print the command that publishes them. The skill produces a draft file and a printed command. The person runs the command, and the skill is finished once it is printed.

## 1. Gather the delta

Take the latest tag as the boundary. List the commits after it (no merges) and the pull requests merged after it, reading titles, bodies and linked issues. The delta is done when each commit is sorted into a highlight candidate or into noise (chores, CI, dependency bumps) that the draft omits.

Confirm the working tree is clean and `HEAD` sits on the branch the repo releases from. If either is off, say so and wait for the person's answer.

If nothing in the delta changes what a user sees, say that and stop: an honest empty result beats an invented highlight.

## 2. Find the release path in the repo

Look for how this repo publishes, in this order, and take the first that answers:

1. The task runner (`justfile`, `Makefile`, `package.json` scripts): a release or publish target, and whether it accepts notes.
2. Changesets (`.changeset/`): publishing is the merge of the version pull request, with the notes landing on the GitHub Release it creates.
3. The CI workflows (`.github/workflows/`): a release workflow with its trigger and inputs.
4. A written procedure in `CONTRIBUTING.md`, `AGENTS.md` or `CLAUDE.md`.

Print the command exactly as the repo states it. If no command takes notes, print the repo's real release step, the draft's path, and where the notes belong (the release body or the version pull request). Mention a flag only once you have found it in the repo.

Learn the voice from the last few published releases (`gh release list`, then `gh release view <tag>`): their person, length, headings, and whether they use emoji. A repo whose releases use no markers gets none.

## 3. Write the highlights

Call the Skill tool with "writing-for-humans" and draft with it in view.

A release note answers one question: what can I do now that I could not before, or what stopped hurting? Open with that, as a heading in plain words, and follow with a sentence or two. For a feature, show a single example the reader can paste. Link the pull requests, issues and docs pages that hold the detail. Secondary changes go in a short closing list. Mention what comes next only when earlier releases did and a real follow-up exists.

Let the amount of text follow the amount shipped: a patch gets a paragraph and a link, one feature gets a lead plus how it works plus a docs link, and a milestone gets a few titled sections.

Leave out the version heading and the generated changelog, which the release tooling adds, and leave `CHANGELOG.md` as it is.

## 4. Save the draft and print the command

Save the draft as `<repo name>-release-notes.md` in the session's scratchpad directory, or the system temp directory when the environment names no scratchpad. A path the person gives wins, and an existing file is replaced. Show the draft or its path so the person can edit it.

Print the step 2 command in a fenced block with the draft's path filled in, plus the prerelease variant when the repo has one. End with one line: you run it, I do not.

## Done when

- Every commit since the tag appears in a highlight or was set aside as noise.
- The draft exists at the printed path.
- The printed command comes from the repo itself, and nothing has been run.
