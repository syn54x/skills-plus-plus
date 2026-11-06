---
name: to-tickets
description: Break an Epic into vertical Sub-issues with blocking edges, publish them under it on GitHub, and pin the plan.
disable-model-invocation: true
metadata:
  credits:
    - skill: to-tickets
      author: Matt Pocock
      url: "https://github.com/mattpocock/skills/tree/main/skills/engineering/to-tickets"
---

Turn an Epic into **Sub-issues** that workers can each build alone: you choose the slices and the edges between them, the user approves them, harden writes each one's **Ticket contract**, and you check the set as a whole before anything is released to the build.

The Epic is the issue named after `/to-tickets` (a number or URL), or the one to-spec wrote earlier in this conversation; read its body and all its comments. The Routing block in `CLAUDE.md` or `AGENTS.md` supplies the Mode, Sizes and Laws lines. A repo with no Routing block is not on the spp flow: stop, and ask the user to run `/setup-spp`.

The examples follow one Epic: scheduled CSV exports of saved reports.

## 1. Slice

Read the code the Epic touches, `GLOSSARY.md`, and the Laws line's documents. Where a slice needs a term the glossary does not have, or the Epic uses a term in a sense the glossary contradicts, call the Skill tool with "domain-modeling" before naming the slice.

Slice by behaviour, never by layer. A slice is a *tracer bullet* when merging it lets someone watch the Epic do one more thing: "export one saved report as CSV" is one, "add the exports table" is not, because a table alone shows nothing. Each slice carries every layer its behaviour touches, tests included, and is small enough for one worker session. Groundwork that makes the Epic's slices simpler goes first, as slices of its own.

Each slice lists its blockers, meaning only the slices whose merged code it needs. "Schedule a weekly export" needs "export one report"; "email the export" and "schedule it" probably need only the first, so they stay unblocked from each other and can share a Wave.

**When a slice cannot land green alone.** Suppose the Epic renames `Report.title` to `Report.name`, and the export, the list view and the scheduler all read it. Any single edit breaks the other two, so no tracer bullet exists for it. Cut it into three phases instead:

| Phase | Slice | Blocked by | CI after it merges |
| --- | --- | --- | --- |
| Expand | Add `name` beside `title`, both filled | none | green, `title` still works |
| Migrate | One slice each for the export, the list view and the scheduler, reading `name` | the expand slice | green, `title` still exists |
| Contract | Remove `title` | all three migrate slices | green, no reader is left |

If the readers are so entangled that a migrate slice breaks the build until its neighbours move too, keep the same three phases, let the migrate slices merge into the Epic's integration branch while red, and make the contract slice the one that must verify green.

## 2. Agree the breakdown

Number the slices, and under each give its title, its blockers, and what the user will be able to see work when it merges. Then ask the user to look for three faults: an edge where the later slice does not in fact need the earlier one; a slice that is really one layer and demonstrates nothing; a slice too large for one session, or so small it is not worth a worker. Revise and repeat until the user approves. Nothing is created before that.

## 3. Publish

1. Put the Epic in planning: `gh issue edit <epic> --remove-label ready-for-agent --add-label needs-plan`, adding `--type Epic` in org mode. A `ready-for-agent` Epic would satisfy the readiness rule itself, and only its Sub-issues are meant to be claimed.
2. Create each Sub-issue after its blockers exist, so that its edges point at real issue numbers:

   ```bash
   gh issue create -R <owner/repo> --title "<title>" --body-file <file> \
     --parent <epic URL> --blocked-by <n>,<n>        # add --type Task in org mode
   ```

   The body carries `## Parent` with the Epic and `## Blocked by` with the blockers (for human readers; spp reads the native edges). It gets no Triage role label yet. A slice is created in the repo whose files it changes, and a blocker in another repo is given by URL.
3. Call the Skill tool with "harden" for every Sub-issue, passing the issue, its approved slice and the Epic. harden writes the Ticket contract and the size. The contract sections are harden's alone, so any later change to one goes back through harden with the change spelled out.

## 4. Check the set

Each harden run saw one Sub-issue. Read all of the hardened bodies together for the four things only the whole set shows.

**Locks that would stall a Wave.** spp never puts two Sub-issues in one Wave when their Files owned share a Modify or Test path, so an overlap between two Sub-issues with no chain of edges between them becomes a delay nobody chose. Two Creates clash only on the same file. For each overlap, either add an edge (`gh issue edit <later> --add-blocked-by <earlier>`) or fold the two slices into one; giving up that bit of parallelism is expected.

**Names that do not line up.** Read each Consumes line next to the Produces line it relies on. The name and signature must match, the producer must be among the Sub-issue's blockers (add the edge when it is not), and each Produces line must name who consumes it.

**Requirements that shrank.** Walk the Epic requirement by requirement, and find the Sub-issue that delivers each one. A requirement shrinks when its Sub-issue covers less than the Epic says (one format where the Epic lists three, no handling for a failure the Epic names, a lower limit) or adds a condition of its own, such as "on the first run only". If nobody intended the difference, send the Sub-issue back to harden to restore the full requirement. If it was intended (the full version is infeasible here, or the user agreed to the split in step 2), it is a change of scope, and only the user can accept it. After they do, ask harden for a `**Narrows:**` line on the Sub-issue, and carry its words to the plan in step 5. Reviewers treat a recorded narrowing as agreed scope, and an unrecorded one as a defect.

**Values worked out twice.** Look for a Sub-issue that works a value out from another module's output: a client that infers each row's state from a summary the server returns, a report that recomputes a total a service already holds. The second derivation has to match the first in every case, and review finds the misses one round at a time. Name each such value to the user and ask whether the module that holds the inputs should produce it itself. If it should, fix the set before release: send the producing Sub-issue back to harden for a Produces line that carries the value, or add a Sub-issue that produces it as step 3 does, with its consumer blocked by it. Either way, send the consuming Sub-issue back to harden to read the value in place of working it out. If the derivation is intended, only the user can accept it; once they do, both Sub-issues stand as written, with no line added.

Finish with `spp status <epic> --json`. A non-empty `cycle` means the edges loop; break the loop before continuing.

## 5. Release and pin the plan

Label each Sub-issue whose `spp lint ticket` prints `ok` with `ready-for-agent`. Any that harden routed to `needs-info` stay there.

The plan is a table in a file, one row per Sub-issue in the layer order `spp status` reports, with Test paths left out:

```markdown
| Layer | Sub-issue | Size | Blockers | Creates and modifies |
| --- | --- | --- | --- | --- |
| 0 | #41 export one saved report as CSV | S | none | C: `src/export/csv.ts`; M: `src/reports/menu.ts` |
| 1 | #42 schedule a weekly export | M | #41 | C: `src/export/schedule.ts`; M: `src/jobs/registry.ts` |
```

A **Multi-repo epic** gets a Repo column after Layer. Pin it with `spp plan`:

```bash
spp plan <epic> --goal "<the Epic's goal in a sentence>" \
  --constraints "<what the Epic's Implementation Decisions fix>" \
  --table-file <file> --narrowed "<an approved narrowing>"
```

Each call's `--narrowed` flags become the whole stored list, so repeat one for every narrowing still agreed, in its `**Narrows:**` words, or give `--narrowed none` once none remain. A Multi-repo epic also passes `--repos a/b,c/d`. The integration branch and any Interface deviations are recorded later by build, so pass neither. With the plan pinned, take `needs-plan` off the Epic.

## 6. Report

Show a table of the Sub-issues: size, blockers, `ready-for-agent` or `needs-info`, and any narrowing. For each `needs-info` one, say what it waits on. Then ask the user to run `/build <epic>`.
