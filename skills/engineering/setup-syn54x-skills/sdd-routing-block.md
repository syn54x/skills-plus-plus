# SDD routing block

Written into `CLAUDE.md` (or `AGENTS.md`) below the `## Agent skills` block. Replace the `<...>` slots. The markers let `setup-syn54x-skills` rewrite the block in place on re-run, and tell `to-tickets` to apply its SDD pass.

```markdown
<!-- sdd-routing -->
## Agent workflow

- Specs and plans live in GitHub Issues. Never create `docs/plans`, `docs/specs`, `.scratch/*/issues` or any plan file in the repo.
- Plan with `/grill-with-docs` → `/to-spec` → `/to-tickets`. Build with `/build-epic <epic#>` (M/L/XL) or `/implement <N>` (one ticket).
- Do not use brainstorming, writing-plans, ce-plan or any other plan-writing skill. `/to-spec` owns the spec; `/to-tickets` owns the plan.
- Workers: TDD, run the issue's **Verify** block, open a PR with `Closes #N`, never merge.
- Readiness = open + not blocked + unassigned + `ready-for-agent`. Claim by assigning yourself. Unclaim if you stop without a PR.
- Progress is one comment per issue under `<!-- sdd-progress -->`, rewritten in place. Never post a second one.
- Mode: <org | labels-only>. Sizes: <`size:S/M/L` labels | issue field `Effort`>. Priority: <none | issue field `Priority`>.
- Upstream feedback: <off | on>. When on, `close-epic` may propose skill-defect issues on syn54x/skills-plus-plus, allowlisted fields only, each one shown and approved by a human before filing; never from a non-interactive run.
<!-- /sdd-routing -->
```
