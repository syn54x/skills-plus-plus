---
name: wayfinder
description: Chart a large effort as a map of decision tickets on GitHub Issues, then settle one decision per session until no decision stands between you and building.
disable-model-invocation: true
---

The person has an effort whose route they cannot see yet: more than one session can hold, wrapped in fog. This skill charts the route as a **map**, one GitHub issue labelled `wayfinder:map`, whose children are **decision tickets** (questions whose answers are decisions, not slices of a build). Then it works them one session at a time.

Read the mode from what follows `/wayfinder`:

| The person gave | Mode |
| --- | --- |
| A loose idea, or nothing | **Chart**: write the map |
| A map's issue number or URL | **Work**: settle one of its tickets |

An issue without the `wayfinder:map` label is not a map; ask what the person meant. When the `wayfinder:` labels do not exist in the repo, ask them to run `/setup-spp`.

## Two laws

1. **One decision per session.** A Work session settles exactly one ticket, of whatever type, and then stops. A Chart session settles none. The person runs other sessions for other tickets, side by side if they like.
2. **Plan, never build.** Reaching the destination (a spec, a decision, a change) is somebody else's later work. Every ticket here ends in a decision, and a task ticket exists only to unblock one. When you feel like doing the destination's work, you have reached the map's edge: say so and stop.

Name every map and ticket by its title in anything the person reads, with the link wrapped around the title. A run of bare numbers tells them nothing.

## Ticket types

Each ticket carries one label, `wayfinder:<type>`, and no other. The label tells you how to settle it; the body never does.

| Type | Label | Worked | Settled by |
| --- | --- | --- | --- |
| Research | `wayfinder:research` | Alone | Call the Skill tool with "research" |
| Prototype | `wayfinder:prototype` | With the person | Call the Skill tool with "prototype" |
| Grilling | `wayfinder:grilling` | With the person | Call the Skill tool twice, for "grilling" and "domain-modeling" |
| Task | `wayfinder:task` | Either | The one piece of manual work a decision is waiting on, such as opening an account to try a vendor's API, or loading sample data to look at its structure |

A ticket worked with the person settles only in a live exchange with them. Answering your own questions on their behalf breaks it. A task ticket you cannot do alone becomes a precise checklist for the person. These four skills are the only ones this skill calls.

## Chart mode

1. **Fix the destination.** To settle what the map is heading for, call the Skill tool twice, for "grilling" and "domain-modeling". It sets the scope, so it comes first. Done when the destination is one or two lines the person has confirmed.
2. **Survey the frontier.** Grill again, this time wide and shallow: list the open decisions across the whole space and the first steps that could start now. When no fog turns up (the route is clear and small enough for one session), there is no map to draw; stop and ask the person how to go on. Done when every open decision is either a question you can phrase sharply or fog.
3. **File the map.** Read [`MAP.md`](MAP.md) now for the body shape and the fog rules, then create the map issue labelled `wayfinder:map`. Done when it holds the Destination, the Notes, an empty Settled section and the fog.
4. **File the tickets.** Read the ticket shape in `MAP.md`. Create every question you can phrase sharply as a child of the map, in dependency order so each ticket can name its blockers by their real numbers as it is created. Done when each ticket has the map as parent, one type label, a `## Question` body and its blocked-by edges, and everything not yet sharp stays in the fog.
5. **Stop.** Name the map and the tickets that can start now, by title, and tell the person to run `/wayfinder` with the map in a fresh session for each one.

## Work mode

1. **Load the map.** Read its body only: Destination, Notes, Settled, Fog, Out of scope. Done when you can state the destination in your own words.
2. **Choose the ticket.** The **frontier** is the map's open children with no open blocker, no `claimed` label and no assignee. Use the ticket the person named; otherwise take the first on the frontier, in the order they were filed. With an empty frontier, go to step 7.
3. **Claim it.** Add the `claimed` label before any work, so a session running beside this one skips the ticket. Done when the label is on the issue.
4. **Settle it** the way its type says, and read a related or closed ticket in full only when it bears on the answer. The Notes carry the effort's domain and standing preferences; follow them.
5. **Record the answer.** Post it as a comment on the ticket, close the ticket, and add one entry to the map's Settled section: the ticket's title linked, then a one-line gist. The detail stays on the ticket. Done when all three are in place.
6. **Redraw the map.** Other sessions edit the same map, so read it again before changing it. From the answer:
   - File tickets for the questions it raised and for fog it has made sharp, then delete each such patch from the Fog section so the question lives only as its ticket.
   - A ticket that now sits beyond the destination is closed and moved to Out of scope with its reason, never settled on the route.
   - A ticket the answer invalidates is edited or deleted.

   Done when no question is both a ticket and a line of fog.
7. **Stop, having settled one.** The route is **mapped** when the map has no open tickets and an empty Fog section. If it is not mapped, name the tickets now on the frontier by title and stop. If it is, say so, and when the destination is a spec or a plan to build, ask the person to run `/to-spec` in this same conversation, since it writes from the conversation held and the map is loaded here. A destination that was only a decision to lock ends here.
