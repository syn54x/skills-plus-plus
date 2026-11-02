# Changesets

Each pull request that changes what users get adds one changeset here: run `npx changeset`, pick the bump (patch, minor or major) and write one or two lines for the changelog. A change users never see (CI, repo laws, tests) needs none.

On every push to `main`, the Release workflow gathers the pending changesets into one "chore: version spp" pull request. Merging it runs `npm run version`, which bumps `package.json`, writes `CHANGELOG.md`, and copies the new version into `.claude-plugin/plugin.json` through `scripts/sync-version.ts`. Claude Code offers installed users the update once that version moves.
