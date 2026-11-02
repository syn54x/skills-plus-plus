# The map issue and its tickets

The map, as it stands part-way through the notes-storage effort. Read it once, then the notes under it.

```markdown
## Destination

A spec for where `spp` keeps worker notes and how the board reads them.

## Notes

Notes are one-line milestone messages from workers. Standing preference: no new service to run.

## Settled

- [What does an issue comment cost us in size and rate?](<link>): 65,536 characters each; far above a one-line note, rate limits are the real cost.

## Fog

Something about retention once an Epic closes, and how a board on another machine would see notes. Neither is worded well enough to ticket.

## Out of scope

- [Mirror notes into chat](<link>): a delivery channel, not storage, so it lies past this destination.
```

Open tickets are not on the map. They are its open children, one per question, each filed like this:

```markdown
## Question

Which notes must outlive the worker that wrote them?
```

## Reading the example

**The map is a table of contents.** Each answer lives on its ticket. The Settled line only points there, so a long effort stays cheap to load.

**Why "Which notes must outlive the worker" is an open ticket.** It waits behind the scratch-repo task, and nobody can answer it yet. It is filed anyway, because the person could be asked it word for word tomorrow, and that is all a ticket needs.

**Why the retention line is fog.** Nobody can yet say what it asks: which notes, kept for whom, and for how long. Filing it now would mean guessing at a question, so it stays one loose sentence. Once the open ticket is settled it may turn into a ticket on deleting notes after an Epic closes, into two, or into nothing at all. Comment cost appears nowhere in Fog, because a settled question has one home, its Settled line.

**Why chat mirroring is out of scope.** It was filed as a ticket while charting. The comment-cost answer showed it is about how notes reach people, which a spec for where notes are kept never promised, so that session closed it with that reason and wrote the line you see. It has no Settled line, since the route to the spec learned nothing from it. If the team wants chat delivery later, it gets a map of its own with that as its destination.

## Creating and finding tickets

File a ticket with `gh issue create --parent <map> --label wayfinder:<type>`, adding `--blocked-by <numbers>` for what it waits on. Create blockers first so the numbers exist, and cross-reference only by real number, because a placeholder links to an unrelated issue. Tickets carry the `wayfinder:` label alone and never `ready-for-agent`, since they hold decisions and not work to build.

To find the frontier, run `gh issue view <map> --json subIssues`, then read each open child's `blockedBy`, `labels` and `assignees`.

The answer goes on the ticket as a comment when it closes, and whatever was made on the way (a prototype branch, a research note's path) is linked from that comment.
