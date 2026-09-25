# Syncing from upstream

This repo is a fork of `mattpocock/skills` (remote `upstream`). The shape of the fork, and why, is in [adr/0003-fork-superset-of-mattpocock-skills.md](./adr/0003-fork-superset-of-mattpocock-skills.md). Merge from upstream on a branch; never rebase `main`.

1. `git fetch upstream && git switch -c chore/sync-upstream-<date> main && git merge upstream/main`.
2. Resolve conflicts:
   - **Renamed skills** (`setup-syn54x-skills`, `ask-syn54x`): git follows the rename, so upstream edits usually land in the new directory. If upstream added a file under the old name, `git mv` it across. Re-apply the rename to any new mention of `setup-matt-pocock-skills` or `ask-matt` in upstream's new prose.
   - **Hooked `SKILL.md`s** (`to-tickets`, `implement`): take upstream's text, then put the fork's hook lines back where they were.
   - **`package.json` / `CHANGELOG.md`**: take upstream's side, then run `npm run version` so `plugin.json` tracks it.
   - **`.claude-plugin/plugin.json`**: keep the fork's name, author and URLs; take upstream's additions to `skills`.
   - **Skills the fork deleted** (`misc/scaffold-exercises`): a modify/delete conflict means upstream edited it; keep it deleted (`git rm`).
   - **`README.md`, `.agents/install-block.md`, `CLAUDE.md`**: keep the fork's install story and fork pointer; take everything else.
3. Upstream's pending changesets arrive keyed `"mattpocock-skills"`. They are valid as-is, because the package name is unchanged.
4. If upstream added, renamed, or removed a user-reachable skill, update `ask-syn54x` and the bucket `README.md`s (see `CLAUDE.md`).
5. `grep -rnE "setup-matt-pocock-skills|ask-matt" . --exclude-dir=.git --exclude=CHANGELOG.md --exclude-dir=.changeset` should print nothing.
6. Run `claude plugin validate . --strict` and `npm run check-plugin-version`, then open a PR.
