---
name: to-tickets
description: Break an Epic into vertical Sub-issues with blocking edges, publish them under it on GitHub, and pin the plan.
disable-model-invocation: true
---

Turn an Epic into **Sub-issues** that workers can build without asking anyone a question: vertical slices with their blocked-by edges, each hardened into the **Ticket contract**, published as native children of the Epic, with the plan pinned on the Epic.

The Epic is the issue named after `/to-tickets` (a number or URL), or the one to-spec wrote earlier in this conversation. Read its body and every comment. Read the Routing block in `CLAUDE.md` or `AGENTS.md` for its Mode, Sizes and Laws lines; when there is none, the repo is not on the spp flow, so stop and ask the user to run `/setup-spp`.

## 1. Read the code

Read the code the Epic touches, `GLOSSARY.md`, and the documents on the Laws line. Slices are named in the glossary's words; when a slice needs a word the glossary lacks, or the Epic uses one against it, call the Skill tool with "domain-modeling". Look for the prefactoring that would make the feature easy to add, and plan it as the first slices.

## 2. Draft tracer bullets

Every slice is a *tracer bullet*: one thin path through each layer it needs (storage, logic, interface, tests) that can be demonstrated or verified on its own and built in a single fresh context. The shape to avoid is one slice per layer, where nothing works until every layer lands and each slice's criteria grade work another worker owns.

Give each slice its blockers, the slices that must merge before it can start. Leave an edge out wherever two slices can run side by side.

**A wide refactor** is the exception: one mechanical change that breaks callers across the codebase (a renamed column, a retyped shared symbol), so no vertical slice can land green. Sequence it in three moves. *Expand*: add the new form next to the old. *Migrate*: move callers over in batches sized by how much each one breaks, every batch blocked by the expand. *Contract*: delete the old form in a slice blocked by every batch. When even a batch cannot stay green alone, the batches share the Epic's integration branch and all block one final slice that integrates and verifies.

## 3. Quiz the user

Show the breakdown as a numbered list. For each slice give its title, its blockers, and what the user can demo once it is done. Ask whether the granularity is right, whether each blocker really gates its slice, and what should merge or split. Revise and show the list again until the user approves it. Nothing is published before that approval.

## 4. Publish and harden

1. Mark the Epic as being planned: `gh issue edit <epic> --remove-label ready-for-agent --add-label needs-plan`, plus `--type Epic` when the Mode line says org. Only its Sub-issues are ever claimable, and an Epic still carrying `ready-for-agent` would match the readiness rule itself.
2. Create the Sub-issues in dependency order, blockers first, so that every edge names an issue that exists:

   ```bash
   gh issue create -R <owner/repo> --title "<title>" --body-file <file> \
     --parent <epic URL> --blocked-by <n>,<n>        # add --type Task in org mode
   ```

   The body holds only `## Parent` (the Epic) and `## Blocked by` (one line per blocker, for people; spp reads the native edge). Add no Triage role label yet. A slice is created in the repo its files live in, and a blocker in another repo is given by URL.
3. For each Sub-issue, call the Skill tool with "harden", passing the issue, the approved slice and the Epic. harden writes the Ticket contract and the size; to-tickets never writes those sections itself.

## 5. Check the Sub-issues against each other

harden sees one issue at a time, so these three checks are yours. Read every hardened body. A fix that changes a section goes back through harden with the change to make; a fix to an edge is yours.

- **Files owned collisions.** Two Sub-issues that can run at the same time (neither blocks the other, directly or through a chain) never both Modify or Test one path. Both may Create different files in one folder. Merge the two, or add an edge with `gh issue edit <n> --add-blocked-by <m>`; the lost parallelism is the accepted price.
- **Consumes and Produces.** Every Consumes line matches, by name and signature, a Produces line on a Sub-issue that blocks it, and every Produces line names its consumer. A Consumes with no edge to its producer gets one.
- **Narrowing against the Epic.** Every requirement in the Epic lands in some Sub-issue at full strength. A Sub-issue narrows the Epic when it drops a case, input, limit, error path or platform the Epic states, or adds a qualifier the Epic does not have ("for now", "only", "except when"). A narrowing nobody chose goes back to harden to be widened. A deliberate one (feasibility, a split agreed at the quiz) is a scope decision, so ask the user. Once they approve, call harden to add the `**Narrows:**` line, and record the same words on the plan in step 6. A narrowing with no line is a defect the reviewers will report against its Sub-issue.

Then run `spp status <epic> --json`. A non-empty `cycle` means the blocked-by edges loop; break the loop before going on.

## 6. Mark ready and pin the plan

Add `ready-for-agent` to each Sub-issue whose `spp lint ticket` prints `ok`. One that harden routed to `needs-info` stays there.

Write the plan table to a file, one row per Sub-issue in the layer order `spp status` reports. Test paths stay out, since the build reads them from the bodies:

```markdown
| Layer | Ticket | Size | Blocked by | Files owned (C/M) |
| --- | --- | --- | --- | --- |
| 0 | #41 export one report as CSV | S | none | C: `src/export/csv.ts`; M: `src/reports/menu.ts` |
| 1 | #42 schedule a weekly export | M | #41 | C: `src/export/schedule.ts`; M: `src/jobs/registry.ts` |
```

A **Multi-repo epic** adds a Repo column after Layer. Pin the plan:

```bash
spp plan <epic> --goal "<one line from the Epic>" \
  --constraints "<what the Epic's Implementation Decisions fix>" \
  --table-file <file> --narrowed "<an approved narrowing>"
```

Pass `--narrowed` once per narrowing that still stands, in the words of its `**Narrows:**` line, on every run: the flag replaces the stored list. With none standing, pass `--narrowed none`, which clears it. Add `--repos a/b,c/d` for a Multi-repo epic. Leave `--branch` and `--add-deviation` to build, which owns them. Once the plan is up, remove `needs-plan` from the Epic.

## 7. Report

One table: each Sub-issue with its size, its blockers, `ready-for-agent` or `needs-info`, and the narrowing it carries, if any. For each `needs-info` Sub-issue, say what it is waiting for. Then ask the user to run `/build <epic>`.
