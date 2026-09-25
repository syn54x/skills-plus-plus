# Section D: SDD pipeline

The spec-driven delivery pipeline (`to-tickets`' SDD pass, `build-epic`, `implement-issue`, `review-pr`, `review-panel`, `sync-progress`, `close-epic`) keeps specs, plans and progress in **GitHub Issues**. This section configures the repo for it. Offer it only when Section A chose **GitHub**: sub-issues, blocking edges and the ready queue exist nowhere else. For any other tracker, skip it and say why in one line.

Ask one question first:

> Set up the SDD pipeline for this repo (epics as issues, parallel builds, gated review)? (recommended: **yes** for a repo you build features in)

On **no**, skip the rest of this file. On **yes**, work through D1 to D5, one answer at a time, leading each with the recommended answer.

## D1. Preflight

```bash
gh --version                      # need 2.94+ for --parent / --blocked-by / --type
gh auth status
gh repo view --json nameWithOwner,owner --jq '{repo: .nameWithOwner, ownerType: .owner.type}'
```

- `gh` older than 2.94: stop Section D and tell the user to upgrade. Nothing in the pipeline works without native sub-issues and dependencies.
- `ownerType` is `Organization`: **org mode**. Issue types and issue fields are available.
- `ownerType` is `User`: **labels-only mode**. Personal repos have no issue types or fields; sizes and priority are labels.
- `ownerType` is `null`: some `gh` versions hide it; fall back to `gh api repos/<owner>/<repo> --jq .owner.type`.

Also note whether the chosen `CLAUDE.md` / `AGENTS.md` already contains `<!-- sdd-routing -->`, and whether `.github/workflows/` exists.

## D2. Labels

Create the pipeline's labels, plus the canonical triage labels so neither `triage` nor the pipeline has to create them on first use. Where Section B recorded overrides, use the override strings for the five triage roles. Idempotent (`--force` updates colour and description if the label exists):

```bash
gh label create needs-triage    --color EDEDED --description "Needs evaluation by a maintainer" --force
gh label create needs-info      --color FBCA04 --description "Ambiguous; ask before building" --force
gh label create ready-for-agent --color 1D76DB --description "Unblocked and fully specified; an agent may claim it" --force
gh label create ready-for-human --color D93F0B --description "Needs a human decision, secret, or review" --force
gh label create wontfix         --color FFFFFF --description "Will not be actioned" --force
gh label create needs-plan      --color 0E8A16 --description "Epic approved as a spec; sub-issues not yet cut" --force
gh label create blocked         --color 5319E7 --description "Waiting on a dependency the tracker knows about" --force
gh label create size:S          --color C2E0C6 --description "One context window, <= 3 files; cloud-eligible" --force
gh label create size:M          --color BFD4F2 --description "Needs a plan; one or two local workers" --force
gh label create size:L          --color F9D0C4 --description "Cross-cutting or multi-worker; local waves only" --force
```

## D3. Org mode extras (skip in labels-only mode)

Ask before creating. Issue types are org-wide, so the org may already have them.

```bash
ORG=$(gh repo view --json owner --jq .owner.login)
gh api "orgs/$ORG/issue-types" --jq '.[].name'
```

If `Epic` and `Task` are missing, offer to create them:

```bash
gh api -X POST "orgs/$ORG/issue-types" -f name=Epic -f description="A spec: problem, solution, stories, decisions" -F is_enabled=true -f color=purple
gh api -X POST "orgs/$ORG/issue-types" -f name=Task -f description="One tracer-bullet sub-issue of an epic" -F is_enabled=true -f color=blue
```

Issue **fields** (Priority, Effort) are optional. If the user wants them, they configure them in the repo's issue settings; record the field names in the routing block so `to-tickets` sets them instead of `size:*` labels.

## D4. Routing block

Fill in the block from [sdd-routing-block.md](./sdd-routing-block.md): the mode line (`org` / `labels-only`), the field names if any, and **upstream feedback**, which defaults to **off**. Ask:

> When an epic closes, may `close-epic` propose skill-defect issues on syn54x/skills-plus-plus? Each one is shown to you first, contains only counts and category names (never repo names, URLs, titles, paths or code), and is filed under your GitHub account. (recommended: **off** unless this is your own repo)

The block **disables competing planners** on purpose: `to-spec` owns the spec and `to-tickets` owns the plan, and a second brainstorming or plan-writing skill produces plan files that nobody reads. If Superpowers, Compound Engineering or a similar suite is installed globally, the block tells the agent not to route through them; recommend leaving them uninstalled in this repo.

Show the rendered block alongside the `## Agent skills` draft in step 3, and write it in step 4 directly below `## Agent skills`. If `<!-- sdd-routing -->` is already present, replace everything between the markers in place; never append a duplicate.

## D5. GitHub Actions (optional)

Ask whether the user wants the **cloud path** for `size:S` issues. On yes, copy both templates from [workflows/](./workflows/) into `.github/workflows/` during step 4:

- `sdd-implement.yml`: runs `/implement-issue <N>` in `claude-code-action` when an issue labelled `size:S` gains `ready-for-agent`.
- `sdd-review.yml`: runs `/review-pr <N>` on every non-draft pull request from an `sdd/*` branch.

Then tell the user what to add, and don't do it for them:

- A repository secret `ANTHROPIC_API_KEY`, **or** the OIDC workload-identity inputs the templates mark in comments. Which one is a project decision; the templates default to the secret.
- The `plugin_marketplaces` input points at `syn54x/skills-plus-plus`; change it if the repo installs from a fork.

## Report

In step 5, add one table for Section D: what existed, what was created, what was skipped and why. Point at the next step: `/grill-with-docs` → `/to-spec` → `/to-tickets`, then `/build-epic <epic#>` or a `ready-for-agent` label on a `size:S` issue.
