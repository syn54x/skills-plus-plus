# Section D: SDD pipeline

The spec-driven delivery pipeline (`to-tickets`' SDD pass, `build-epic`, `implement-issue`, `review-pr`, `review-panel`, `sync-progress`, `close-epic`) keeps specs, plans and progress in **GitHub Issues**. This section configures the repo for it. Offer it only when Section A chose **GitHub**: sub-issues, blocking edges and the ready queue exist nowhere else. For any other tracker, skip it and say why in one line.

Ask one question first:

> Set up the SDD pipeline for this repo (epics as issues, parallel builds, gated review)? (recommended: **yes** for a repo you build features in)

On **no**, skip the rest of this file. On **yes**, work through D1 to D4, one answer at a time, leading each with the recommended answer.

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

Also note whether the chosen `CLAUDE.md` / `AGENTS.md` already contains `<!-- sdd-routing -->`, and whether `.github/workflows/sdd-implement.yml` or `.github/workflows/sdd-review.yml` already exists.

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
gh label create claimed         --color FBCA04 --description "Held by a worker; set before work, cleared on stopping without a PR" --force
gh label create size:S          --color C2E0C6 --description "One context window, <= 3 files" --force
gh label create size:M          --color BFD4F2 --description "Needs a plan; one or two local workers" --force
gh label create size:L          --color F9D0C4 --description "Cross-cutting or multi-worker; local waves" --force
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

Fill in the block from [sdd-routing-block.md](./sdd-routing-block.md): the mode line (`org` / `labels-only`), the field names if any, and the **upstream feedback** profile, which defaults to **off**. Ask, showing the table:

> When an epic closes, may `close-epic` propose skill-defect issues on syn54x/skills-plus-plus? Each one is shown to you first, filed under your GitHub account, and public. Pick what it may send:
>
> | Profile | What it sends |
> |---|---|
> | `off` | nothing |
> | `counts` | skill, step, a category name, retro counts, harness version, one sentence you type; never repo names, URLs, titles, paths or code |
> | `detailed` | `counts`, plus a few sentences on what the skill said, what the agent did, and what you had to do by hand |
> | `attributed` | `detailed`, plus this repo's name and links to the epic, its tickets and PRs |
>
> (recommended: **off** unless this is your own repo; **counts** or **detailed** if it is)

Write the answer as `Upstream feedback: <profile>`. If an existing block says `Upstream feedback: on`, write `counts` (what `on` already meant) and tell the user the line was rewritten.

Then fill the **Laws line**. Its default is every document on the fallback list that exists in the repo: `CLAUDE.md`, `AGENTS.md`, `GLOSSARY.md`, `CONCEPTS.md`, `CODING_STANDARDS.md`, `CONTRIBUTING.md`, and the ADR directory (`docs/adr/`, or the path `docs/agents/domain.md` names). Check each with `test -e`; list only what exists. Ask once, leading with that default:

> These documents bind every worker and reviewer: `<default list>`. Does any other document bind (a design system, a read-before-UI-work page)? Name its path, or say none.

Write the answer as `Laws: <default list>, <any extra paths>`. If an existing block already has a `Laws:` line, carry every entry forward as it stands, drop none, and propose only documents not yet listed (the default list's missing entries, plus the question above). Tell the user which entries were added.

The block **disables competing planners** on purpose: `to-spec` owns the spec and `to-tickets` owns the plan, and a second brainstorming or plan-writing skill produces plan files that nobody reads. If Superpowers, Compound Engineering or a similar suite is installed globally, the block tells the agent not to route through them; recommend leaving them uninstalled in this repo.

Show the rendered block alongside the `## Agent skills` draft in step 3, and write it in step 4 directly below `## Agent skills`. If `<!-- sdd-routing -->` is already present, replace everything between the markers in place; never append a duplicate.

## Report

In step 5, add one table for Section D: what existed, what was created, what was skipped and why. Point at the next step: `/grill-with-docs` → `/to-spec` → `/to-tickets` → `/build-epic <epic#>`.

When D1 found `sdd-implement.yml` or `sdd-review.yml`, add a line to the report that names each file found, says an earlier version of this pack wrote it, and points at `.out-of-scope/cloud-workflow-templates.md` in syn54x/skills-plus-plus for why the pack dropped it. Leave the files in place: setup never deletes a user's files.
