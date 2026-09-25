# skills-plus-plus

A collection of agent skills (slash commands and behaviors) loaded by Claude Code, forked from Matt Pocock's skills and extended with the SDD flow. Skills are organized into buckets and consumed by per-repo configuration emitted by `/setup-syn54x-skills`.

## Language

**Issue tracker**:
The tool that hosts a repo's issues: GitHub Issues, Linear, a local `.scratch/` markdown convention, or similar. Skills like `to-tickets`, `to-spec`, and `triage` read from and write to it.
_Avoid_: backlog manager, backlog backend, issue host

**Issue**:
A single tracked unit of work inside an **Issue tracker**: a bug, task, spec, or slice produced by `to-tickets`.
_Avoid_: ticket (use only when quoting external systems that call them tickets, for a **Decision ticket**, or where a skill's own name says ticket, as `to-tickets` does)

**Decision ticket**:
A `wayfinder` unit: a child **Issue** of a `wayfinder:map` holding a *question* whose resolution is a decision, not a slice of a build to execute. The **decision** qualifier is what keeps it distinct from an implementation ticket; `wayfinder` introduces the term, then uses "ticket".

**Triage role**:
A canonical state-machine label applied to an **Issue** during triage (e.g. `needs-triage`, `ready-for-afk`). Each role maps to a real label string in the **Issue tracker** via `docs/agents/triage-labels.md`.

### SDD flow

**Epic**:
The spec as one GitHub **Issue** (type `Epic` on org repos), written by `to-spec`. Its body is the spec; its `<!-- sdd-plan -->` comment is the plan.

**Sub-issue**:
One tracer-bullet **Issue** under an **Epic**, linked natively (`--parent`, `--blocked-by`). `to-tickets`' SDD pass gives it **Files owned** (Create / Modify / Test), **Interfaces** (Consumes / Produces), **Test scenarios** and a **Verify block**.

**Routing block**:
The `<!-- sdd-routing -->` block `setup-syn54x-skills` writes into `CLAUDE.md` or `AGENTS.md`. Its presence is what switches a repo onto the SDD flow.

**Ready queue**:
The **Sub-issues** that are open, have no open blockers, are unassigned and carry `ready-for-agent`. Derived by `gh`, never read from a status label.

**Layer**:
The **Sub-issues** whose blockers all sit in earlier layers. Layer 0 is the initial **Ready queue**.

**Wave**:
One concurrent dispatch of 3 to 5 workers over the current **Ready queue**, one worktree each.

**Claim**:
Assigning yourself to a **Sub-issue**. Removes it from the **Ready queue**; undone by unclaiming.

**Verify block**:
The fenced commands in a **Sub-issue**'s `## Verify`; green means done. Recorded on the commit as `git notes --ref=sdd-verify`.

**Size ladder**:
`size:S` builds in the cloud (`claude-code-action`), `size:M` and `L` in local **Waves**, XL as a dynamic workflow.

**Multi-repo epic**:
An **Epic** whose **Sub-issues** live in more than one repo. Sub-issues are named by URL; each repo gets its own integration branch, worktrees and PRs; a cross-repo blocker must be merged **and available** before its consumer is ready.

**Slice gate / main gate**:
`review-pr` gates a slice PR into the integration branch (one fresh reviewer, spec and quality verdicts). `review-panel` gates the PR to `main` once per **Epic** (a **Persona** panel plus review-pr's spec and Coherence verdicts).

**Persona**:
One read-only reviewer prompt in `review-panel/PERSONAS.md` with a fixed Focus: always-on (correctness, testing, maintainability, standards-and-invariants, history) or conditional on what the diff touches.

**Retro**:
Per-**Epic** counts that `close-epic` computes from GitHub state alone and posts under `<!-- sdd-retro -->`. Names which step was weak; stays in the user's repo.

**Skill feedback**:
A `skill-feedback` **Issue** on `syn54x/skills-plus-plus` that `close-epic` may propose for a `[skill]` learning: allowlisted fields only, off by default, previewed and approved one by one, never from a non-interactive run.

**Harness dispatch**:
The one step of `build-epic` that differs per tool; `build-epic/HARNESS-DISPATCH.md` holds the concrete calls.

### Scaffolds

**Template bag**:
A scaffold skill's `REFERENCE.md`: the only owner of the file bodies an agent copies into a new project.

**Feature matrix**:
The table in a scaffold's `SKILL.md` mapping each flag to its dependencies, files, hooks, workflows and verify step. The seam between policy and templates.

**Baseline**:
The always-on row of a **Feature matrix**.

**Feature flag**:
An optional **Feature matrix** row chosen in discovery. Python: `cli`, `api`, `database`, `logfire`, `docs`, `pypi`, `syn54x-skills`. Frontend: `e2e`, `api`, `syn54x-skills`.

## Relationships

- An **Issue tracker** holds many **Issues**
- An **Issue** carries one **Triage role** at a time
- A **Decision ticket** is an **Issue** (a child of a `wayfinder:map`)
- An **Epic** holds many **Sub-issues**; a **Sub-issue** may live in another repo than its **Epic**
- A **Wave** dispatches part of the **Ready queue**

## Flagged ambiguities

- "backlog" was previously used to mean both the *tool* hosting issues and the *body of work* inside it. Resolved: the tool is the **Issue tracker**; "backlog" is no longer used as a domain term.
- "backlog backend" / "backlog manager". Resolved: collapsed into **Issue tracker**.
