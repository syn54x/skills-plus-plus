# A claim is a mark the tracker records, not an assignment

The SDD skills claimed a **Sub-issue** by assigning yourself, and `build-epic`'s guardrail read "Readiness comes from links and assignees, never from a status label". The cloud path broke that: `claude-code-action` operates GitHub as an app, and GitHub silently drops an assignee that is not a collaborator with push access, so a cloud worker could never hold the ticket it was building and the ticket stayed in the ready queue while it ran. Only GitHub's own Copilot has an assignable bot actor. We replace the assignment with a **Claim mark** that every identity can set: the label `claimed` on GitHub and GitLab, the `Status: claimed` line the local tracker already used. A ticket is **held** when it carries the mark or an assignee; agents write only the mark, and a human's self-assignment still counts, so an agent never takes a person's work.

## Decisions

- **One operation, one seam.** Claim and unclaim stay on `sync-progress`'s interface, with one adapter per tracker. `implement-issue` §2 claims and §9 unclaims, locally and in the cloud alike; the cloud workflow only launches the skill. Two runs started by twin label events serialise under the workflow's concurrency group, and the second stops at the readiness check because the mark is already there.
- **Lifecycle of an assignee, not of a status.** The holder sets the mark before any work and clears it only when stopping without a PR (`BLOCKED`, `NEEDS_CONTEXT`, `ready-for-human`). It stays through `pr-open`; a mark on a closed issue is inert because readiness requires open. The superseded guardrail now reads: readiness is derived from open state, blockers, the claim mark and `ready-for-agent`, never from a *workflow status* label (`todo`, `in-progress`, `done`), which humans move by hand and which drifts.
- **Who holds it** is on the progress comment's **Worker** line (agent name, Actions run URL, or login), not in the mark. "Assigned to you, so you may resume" becomes "the Worker line names you".
- **The worker may create the label.** On a repo set up before the mark existed, `gh issue edit --add-label` fails with `'claimed' not found`. `implement-issue` runs `gh label create claimed --force` before its first claim, idempotent and within the `issues: write` it already has, rather than failing every cloud run until a human re-runs setup. This is the one place a worker touches repository configuration; `actions/stale` sets the precedent.
- **The retro's claim time** reads the first `labeled claimed` event and falls back to the first `assigned` event for epics built before the mark. Same measure, same meaning, no schema bump.
- **Wayfinder is untouched.** Its child tickets are not Sub-issues and their claimant is always a human with push access, so "assigned to the driving dev" stands.

## Considered options

- **Assign the human who applied the label** in the cloud: three lines, but it shows a person holding a bot's work and keeps two definitions of one concept.
- **Label in the cloud, assignment locally**: two adapters for one path, so every reader of held-ness checks both forever.
- **A workflow step that adds the label before the action runs**: a second implementation of claim, outside the skill that owns unclaim.

## Consequences

- `setup-syn54x-skills` creates the label and rewrites the routing block's readiness line; `ready.sh` gains a `claimed` boolean; the cloud guard checks the label and fires on either of `ready-for-agent` and `size:S`, so label order no longer matters.
- The readiness predicate still lives in three places (`ready.sh`, `implement-issue` §1, the workflow `if:`), as it did with assignment. Noted, not fixed here.

## Update, 2026-10-25

The claim mark is now GitHub-only: the label `claimed`, set and cleared through `sync-progress`. [ADR 0007](./0007-marker-comments-carry-a-data-trailer.md) removed the GitLab and local-tracker adapters, because the SDD pipeline runs on GitHub Issues alone and that seam had one real adapter, so the first decision's "one adapter per tracker" no longer holds. The §9 unclaim is replaced by the **Hand-back**: one `sync-progress` call that records why on the progress comment, routes the issue, then clears the mark. The lifecycle changes for one path. The holder still sets the mark before any work, clears it by its own Hand-back only when stopping without a PR, and otherwise keeps it through `pr-open`. A gate's Hand-back may now clear the mark while the PR stays open: `review-pr` routing a ticket after its fix round, and `build-epic` routing one after the ceiling-tier dispatch. For that path this supersedes "It stays through `pr-open`" in the lifecycle decision: the ticket has gone back to a person or a queue, and a mark left on it would name a holder who is no longer building it.
