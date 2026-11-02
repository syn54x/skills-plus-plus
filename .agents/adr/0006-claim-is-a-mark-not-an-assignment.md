# A claim is a label, not an assignment

1.x first claimed a **Sub-issue** by assigning the worker. That failed for any identity GitHub will not assign: an app or bot without push access is dropped silently, so its ticket stayed in the **Ready queue** while it was being built. We claim with a **Claim mark** instead, the label `claimed`, which every identity that can edit labels can set.

## Decisions

- **Held** means the issue carries the `claimed` label or has an assignee. Agents write only the label; a person who assigns themselves still holds the ticket, so an agent never takes a person's work.
- **One owner.** `spp claim`, `spp unclaim` and `spp hand-back` are the only writers of the mark.
- **Lifecycle of an assignee.** The holder sets the mark before any work. It stays through `pr-open`. It is cleared by a **Hand-back**: the worker's own when it stops without a pull request, or a gate's when it routes a ticket whose pull request stays open, because a mark on a ticket that went back to a queue would name a holder who is no longer building it. A mark on a closed issue is inert, since readiness requires open.
- **Readiness** is derived from open state, blockers, the mark, assignees and `ready-for-agent`. It is never read from a workflow status label (`todo`, `in-progress`), which people move by hand and which drifts.
- **Who holds it** is the progress comment's Worker line, not the mark itself.
- **The worker may create the label.** On a repo set up before the mark existed, adding it fails, so `spp claim` creates `claimed` idempotently first. It is the one place a worker touches repository configuration.
- **The retro's claim time** is the first `labeled claimed` event.

## Considered options

- Assign the person who applied the ready label: shows a person holding an agent's work.
- A label for some paths and an assignment for others: every reader of "held" would check both forever.
