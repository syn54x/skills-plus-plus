This repository is spp 2.0: a Claude Code plugin named `spp` and a TypeScript command-line tool of the same name, together a spec-driven delivery system on GitHub Issues. It was rebuilt from scratch on the orphan branch `next`; why, and what it no longer does (no upstream sync, no bucket folders), is in [ADR 0008](./.agents/adr/0008-rebuild-spp-from-scratch.md).

## Layout

- `skills/<name>/SKILL.md`: one folder per skill, flat. Claude Code finds them without a list in the manifest, so `.claude-plugin/plugin.json` has no `skills` array.
- `spp/src/` holds the command-line tool's source and `spp/test/` its tests. `bin/spp` is the executable the plugin puts on the Bash tool's PATH and the npm package `@syn54x/spp` exposes.
- `scripts/` holds the repo checks, with tests in `scripts/test/`.
- `.agents/` holds the laws below and the ADRs under `.agents/adr/`.

Node 22.18 or later runs the `.ts` files directly, so there is no build step. The package has no runtime dependencies. Its dev dependencies are `typescript`, `@types/node` and `@changesets/cli`, plus `typedoc` and `typedoc-plugin-markdown`, which generate the command reference under `docs/reference/spp/` from the commands' TSDoc (`npm run docs:reference`). TypeScript stays on 6.0, the last release whose compiler API TypeDoc can load. Imports use explicit `.ts` extensions. Tests use `node:test` and `node:assert`.

## Checks

Run these before opening a pull request. CI runs the same list on every pull request (`.github/workflows/ci.yml`):

```bash
npm ci
npm run typecheck
npm test
npm run docs:reference && git add --intent-to-add docs/reference && git diff --exit-code docs/reference
node scripts/check-size.ts
node scripts/check-invocation.ts
node scripts/check-registry.ts
node scripts/sync-version.ts --check
claude plugin validate .
uv run --frozen zensical build --clean --strict
```

Each check prints one line per violation and exits non-zero when there is any.

## Size budget

Claude Code re-attaches about 5,000 tokens of a skill after compaction, and whatever lies past that is silently lost. So `scripts/check-size.ts` fails:

- a `SKILL.md` over 12 KB (about 3,000 tokens);
- a frontmatter `description` over 1,024 characters;
- any other `.md` file under `skills/` over 20 KB.

When a skill outgrows its budget, move the detail into a reference file in the same skill folder and point to it from the step that needs it.

## Evals

`evals/` holds cases for `claude plugin eval`, which runs them with the plugin and against a no-plugin baseline and reports the score delta; the layout is in [evals/README.md](./evals/README.md). A fix for a skill defect ships with one eval case that reproduces it. `.github/workflows/evals.yml` runs the suite on the Changesets release pull request and on manual dispatch, never on every pull request.

## Invocation

Every skill is user-invoked or model-invoked, and no skill calls a user-invoked one. The rules, and the friends allowlist, are in [.agents/invocation.md](./.agents/invocation.md); `scripts/check-invocation.ts` enforces them.

## Portability law

Claude Code is the only harness 2.0.0 ships for. These three rules keep a later Codex or Cursor port to a new reference file, a driver and a manifest, with no rewrite:

1. Claude-only features (session drivers, the epic board, workflows, hooks) sit at the edges behind capability detection.
2. Skills name capabilities, never harness tools.
3. Each harness's specifics live in one reference file, read only on that harness.

The skill text, GitHub state, the ticket contract and `spp` stay portable.

## Versions and releases

`package.json` owns the version. `node scripts/sync-version.ts` copies it into `.claude-plugin/plugin.json`, and `npm run version` runs it after `changeset version`, so the two never drift. A pull request that changes what users get adds a changeset (`npx changeset`); the Release workflow turns the pending ones into a version pull request. Install wording lives once, in [.agents/install-block.md](./.agents/install-block.md), and every other copy is taken from it.

## Docs

Every promoted skill gets a human-facing page on the docs site at `https://skills.x54.sh`. [.agents/writing-docs.md](./.agents/writing-docs.md) holds the page template and when to re-sync a page.

## Prose

No em-dashes anywhere in this repository: skills, docs, README, changelog, ADRs, changesets and code comments. Where a sentence reaches for one, rewrite it with whatever it wants (a comma, colon, period, parentheses or a conjunction); never swap the character mechanically.

Every skill is written in this project's own voice. Concepts from the projects credited in the README carry over; their text does not.

## Domain

`GLOSSARY.md` holds the terms and `.agents/adr/` the decisions. `SCOPE.md` is the bar every issue is judged against. Issues and specs live in GitHub Issues on `syn54x/skills-plus-plus`, through the `gh` CLI.

<!-- sdd-routing -->
## Agent workflow

- Specs and plans live in GitHub Issues. Never create a plan or spec file in the repo.
- Plan with `/grill` (or `/auto-grill`), then `/to-spec`, then `/to-tickets`; a filed bug or enhancement goes through `/triage`. Build with `/build <N>`. Until 2.0.0 ships, the v1 plugin's `/build-epic` and `/implement` build this repo.
- Workers: test first, run the issue's **Verify** block, open a pull request with `Closes #N`, never merge.
- Readiness = open + not blocked + not held (no claim mark, no assignee) + `ready-for-agent`. Claim by adding `claimed`. Hand back (route, clear the claim mark, record why) if you stop without a pull request.
- Progress is one comment per issue under `<!-- sdd-progress -->`, rewritten in place. Never post a second one.
- Mode: org
- Sizes: `size:S/M/L` labels
- Laws: CLAUDE.md, GLOSSARY.md, .agents/adr/, .agents/invocation.md, .agents/writing-docs.md, .agents/install-block.md
<!-- /sdd-routing -->
