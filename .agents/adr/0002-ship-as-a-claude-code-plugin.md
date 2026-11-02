# Ship spp as a Claude Code plugin; other harnesses later

People want to subscribe to the skill set as a managed bundle that stays current, not copy files they then own. Claude Code's plugin system gives exactly that, and it also puts a plugin's `bin/` on the Bash tool's PATH, which is how the `spp` command-line tool reaches every skill.

## Decision

- Ship one Claude Code plugin named `spp`, listed in the `syn54x` marketplace that `.claude-plugin/marketplace.json` defines in this repository. The plugin name must be kebab-case to install from a marketplace, and skill names allow only lowercase letters, digits and hyphens, so `spp` it is.
- Lay skills out flat, as `skills/<name>/SKILL.md`. Claude Code discovers that layout without a `skills` list in `plugin.json`, so there is no curated list to keep in step. The 1.x bucket folders existed to separate shipped from unshipped skills; in 2.0 a skill that does not ship does not live in `skills/`.
- Publish the `spp` tool to npm as `@syn54x/spp` as well, so harnesses whose plugins cannot put executables on the PATH can run it through `npx`.
- Defer Codex and Cursor manifests. The portability law in `CLAUDE.md` keeps that port to a reference file, a driver and a manifest per harness.

## Invariants

- `.claude-plugin/plugin.json`'s `version` equals `package.json`'s. Claude Code decides whether installed users see an update from that field, so a drift means a release nobody receives. `scripts/sync-version.ts` copies it on `npm run version`, and its `--check` mode fails CI on a mismatch.
- `claude plugin validate .` passes on every pull request.

## History

The 1.x plugin, `skills-plus-plus`, listed its promoted skills one by one in `plugin.json` because the bucketed layout could not be selected by one path, and it later shipped Cursor and Codex manifests of uneven verification. The flat layout and the deferral replace both.
