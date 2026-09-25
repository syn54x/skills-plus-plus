---
name: prepare-release-notes
description: >-
  Drafts bloggy GitHub Release highlights from commits/PRs since the latest tag,
  writes them to a temp markdown file, and prints the release command for the
  user to run. Use when preparing a release, drafting release notes, cutting a
  release, or when the user mentions release highlights.
---

# Prepare Release Notes

Draft the human-written **highlights** block for a GitHub Release. Never cut
the release yourself.

## Hard rules

- **Never** run the project's release command (`just release`, `just prerelease`,
  `gh workflow run release.yml`, `gh release create`, …).
- Stop after writing the temp file and printing the command for the user.
- Do **not** edit `CHANGELOG.md` when the project generates it at release time.
- Highlights only; do not include the auto-generated changelog section.

## Workflow

```
- [ ] 1. Find last tag + gather delta
- [ ] 2. Bind to this repo's release command and voice
- [ ] 3. Draft bloggy highlights
- [ ] 4. Write /tmp notes file
- [ ] 5. Print the release command (do not run it)
```

### 1. Gather changes since last tag

```bash
LAST_TAG=$(git describe --tags --abbrev=0)
git log "${LAST_TAG}..HEAD" --oneline
git log "${LAST_TAG}..HEAD" --format='%h %s' --no-merges
gh pr list --state merged --search "merged:>$(git log -1 --format=%cI ${LAST_TAG})" --limit 50
```

Also skim merged PR bodies/titles for user-facing framing, issue links, and docs
URLs. Ignore pure chore/CI noise unless it is the whole release.

If working tree is dirty or HEAD is not on the intended release branch, warn and
ask before drafting.

### 2. Bind to this repo

From `justfile`, `AGENTS.md`, and the last few `gh release view` tags:

- **Release command**: if `just release` takes a notes/highlights argument,
  that is the command to print. If it takes a prerelease variant, offer that
  too. If release takes no notes, still draft highlights and print the project's
  release command plus where to paste the notes; do not invent a highlights
  flag.
- **Voice**: match this repo's recent GitHub Releases, not a generic changelog.
- **Docs base URL**: use the project's real docs host when linking.

### 3. Draft highlights (bloggy style)

Shape:

1. **Headline**: `## <plain-language win> <optional emoji>`
2. **Lead**: 1–3 sentences: what the user can do now / what broke and is fixed.
   Anchor on a concrete API/example when the change is a feature.
3. **Body**: short sections or tight prose; code samples when they clarify the
   win; link issues/PRs and docs.
4. **Optional**: `## Also in this release` for secondary items; `## What's next`
   only if prior releases set that expectation and there is a real follow-up.
5. **Stop**: do not include a `## vX.Y.Z` changelog section (release tooling
   adds it).

Voice:

- Plain language, example-first: show what the user sees, then explain.
- Conversational but precise; celebrate the win without marketing fluff.
- Prefer one coherent story over a bullet dump of commit subjects.
- Patch/bugfix releases can be shorter (headline + one dense paragraph + issue
  link).
- Feature releases can be longer with acts/sections.

### 4. Write the temp file

```bash
REPO=$(basename "$(git rev-parse --show-toplevel)")
NOTES="/tmp/${REPO}-release-notes.md"
# write drafted markdown to $NOTES
```

Use that path unless the user names another. Overwrite if present.

Show the user the drafted notes (or the path) so they can edit before releasing.

### 5. Print the command: do not run it

When `just release` takes notes, end with exactly this form (path filled in):

```bash
just release "$(cat /tmp/<repo>-release-notes.md)"
```

For a prerelease, offer instead (still do not run):

```bash
just prerelease "$(cat /tmp/<repo>-release-notes.md)"
```

Otherwise print the project's actual release command and the notes path.

Remind: user runs it; agent does not.

## Scale the draft to the delta

| Delta | Highlights length |
|-------|-------------------|
| One bugfix / small patch | Headline + 1 paragraph + issue/PR link |
| One feature | Headline + lead + short how-it-works + docs link |
| Multi-feature milestone | Headline + lead + 2–4 sections; optional Also / What's next |

If the delta is empty (`LAST_TAG..HEAD` has nothing user-facing), say so and do
not invent notes.
