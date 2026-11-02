# The map and its tickets

The map is an index and not a store. Each decision is written once, on the ticket that settled it, and the map carries only a title link and a gist. Open tickets are absent from the map; they are its open children, found by query.

## Map body

```markdown
## Destination

<One or two lines naming what the effort is heading for: a spec, a decision to lock, or a change to make.>

## Notes

<The domain, standing preferences for this effort, and where its background lives.>

## Settled

- [<closed ticket's title>](<link>): <a short gist of the answer>

## Fog

<Suspected questions inside the destination's scope that are not sharp enough to ticket yet.>

## Out of scope

- [<closed ticket's title>](<link>): <gist, and why it lies beyond the destination>
```

## Ticket body

Every ticket is filed under the map as a child, sized so one session can settle it:

```markdown
## Question

<The one decision this ticket settles, or the fact it must find.>
```

Create a ticket with `gh issue create --parent <map> --label wayfinder:<type>`, adding `--blocked-by <numbers>` for the tickets it waits on, so a blocker is created before the ticket that waits on it. Link tickets to each other by real numbers, since a placeholder number links to some unrelated issue. Tickets carry the `wayfinder:` label alone and never `ready-for-agent`: they hold decisions, not work to build.

To find the frontier, list the map's children with `gh issue view <map> --json subIssues`, then read each open child's `blockedBy`, `labels` and `assignees`. A ticket is unblocked once all its blockers are closed.

The answer stays out of the body. It goes on the ticket as a comment when the ticket settles, and anything made along the way (a prototype branch, a research note's path) is linked from that comment.

## Fog

The map is incomplete on purpose. Beyond the live tickets lie decisions you can sense but not yet word, because each hangs on a question that is still open. Settling a ticket thins the fog around it, and whatever turns sharp becomes a ticket, until the route is mapped.

Ask whether you can word the question exactly, not whether anyone can answer it today.

- A **ticket** is a question you can word exactly, even if a blocker keeps anyone from starting.
- **Fog** is a question you can only gesture at. Write it as coarsely as the view allows. One patch may later become several tickets or none, so do not cut it into ticket-sized pieces ahead of time.

The Fog section never repeats what is Settled, what already has a ticket, or what is out of scope.

## Out of scope

The destination sets the scope, and fog gathers only toward it, so anything past it is out of scope, never fog. A ticket found to lie past the destination is closed, and an Out of scope entry records its gist and the reason. It stays out of Settled, the log of the route taken. Such work comes back only through a redrawn destination, as a new effort.
