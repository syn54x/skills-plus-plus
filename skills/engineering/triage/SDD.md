# SDD hardening

This section applies only when the repo's `CLAUDE.md` or `AGENTS.md` carries the `<!-- sdd-routing -->` block (the Routing block) and the outcome is `ready-for-agent`. Without the block, the outcome is the agent brief alone.

On an SDD repo, `implement-issue` (run by `/implement`) builds from the issue body and moves an issue lacking the SDD sections to `needs-info`. So a triaged issue leaves carrying what a Sub-issue carries, and one `size:*` label.

The hardening rules and the size table have one home: section 1 of the `to-tickets` SDD pass, `to-tickets/SDD.md` in the skills tree (`../to-tickets/SDD.md` from this file). `to-tickets` is user-invoked, so the Skill tool cannot load it: read that file yourself, now. If it is missing, stop and tell the user to install `to-tickets`.

Apply its section 1 to this one issue, reading the code first:

1. **Draft the body sections**, appended below the reporter's text: `## What to build` (the brief's desired behaviour) and `## Acceptance criteria` (the brief's checklist), which the readiness check also requires, then `## Files owned`, `## Interfaces`, `## Test scenarios` and `## Verify`, each by its rule there. Interfaces is usually `Consumes: none` and `Produces: none` for a one-off. The sections keep every case, limit and error path the brief states. Files owned names paths because there a path is a claim on the file; the brief itself still names none.
2. **Gate it** with the no-placeholders rule and the four code checks. The rules that relate tickets to each other (path collisions, the consistency pass, blocking edges, narrowing against an epic) have no second ticket here; skip them.
3. **Size it** from the size table: exactly one `size:S`, `size:M` or `size:L` label (or the Effort field, if the Routing block names one). The size is the label, never a brief field. A one-off has no epic, so its build route is `/implement <N>` at every size.

Done when the body carries all six sections with no placeholder, every code check passes, and the issue carries exactly one size. Then write the body (`gh issue edit "$N" --body-file`), apply the labels and post the brief: the reporter sees one triage comment and an edited body.

When a gap cannot be fixed inline (a scenario with no data to assert on, a Verify command that does not resolve or is red on the default branch), the outcome is `needs-info` instead: leave the body unedited, apply no `size:*` label, and post the triage notes with each gap under "What we still need".
