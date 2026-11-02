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

**Ticket or fog.** Test whether you could write the ticket's question today, not whether anyone could answer it. "Which notes must outlive the worker?" is a ticket even while a blocker holds it. "Something about retention" is fog: leave it coarse. Fog may later become several tickets or none, and it must never repeat a Settled line, an open ticket or an Out of scope line.

**Out of scope.** The destination caps the scope, and fog only gathers toward it. A ticket found to lie past it is closed with a reason, and it is not a Settled entry, because Settled records the route taken. Such work can come back only by redrawing the destination, which starts a new effort.

## Creating and finding tickets

File a ticket with `gh issue create --parent <map> --label wayfinder:<type>`, adding `--blocked-by <numbers>` for what it waits on. Create blockers first so the numbers exist, and cross-reference only by real number, because a placeholder links to an unrelated issue. Tickets carry the `wayfinder:` label alone and never `ready-for-agent`, since they hold decisions and not work to build.

To find the frontier, run `gh issue view <map> --json subIssues`, then read each open child's `blockedBy`, `labels` and `assignees`.

The answer goes on the ticket as a comment when it closes, and whatever was made on the way (a prototype branch, a research note's path) is linked from that comment.
