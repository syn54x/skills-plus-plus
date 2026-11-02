---
name: wayfinder
description: Chart a large effort as a map of decision tickets on GitHub Issues, then settle one decision per session until no decision stands between you and building.
disable-model-invocation: true
---

Use this when a person has a destination in mind but cannot yet see how to get there, and the effort is bigger than one session. The result is a **map**: one GitHub issue labelled `wayfinder:map`, with a **Decision ticket** as each child. Sessions then settle the tickets, one per session.

Running example in this file: a team wants a spec for where `spp` keeps worker notes. They do not yet know the options, so the map's first tickets are questions such as "What does a GitHub issue comment cost us in size and rate?" and "Which notes must outlive the worker that wrote them?".

`/wayfinder` takes a loose idea to chart a map, or a map's number or URL to work one. An issue without the `wayfinder:map` label is not a map; ask what the person meant. If the `wayfinder:` labels are missing from the repo, ask them to run `/setup-spp`.

## Two laws

1. **One ticket per session.** Charting settles none and working settles exactly one, whatever its type. In the example, a session that has just settled the size-and-rate question stops there, even though the next question is ready, because that answer may change how the next question should be asked. Other sessions can take other tickets meanwhile.
2. **The map decides; it does not deliver.** The team's spec, and later the code, are built elsewhere. Writing the notes store inside a wayfinder session, or a draft of the spec, is the signal that the map is finished or that a ticket was mis-typed. Say which, then stop.

Refer to a map or ticket by its title wherever the person reads it, with the link on the title.

## Chart a map

Run one interview, calling the Skill tool twice, for "grilling" and "domain-modeling".

- **First, the destination.** Settle it in a line or two and get the person's agreement. It bounds everything that follows: "a spec for where `spp` keeps worker notes" excludes how the board draws them.
- **Then, keep asking yourself one question.** "What else has to be decided before the team could write this spec?" Let each answer open a new area instead of digging into the last one: for the notes store, comment cost, which notes persist and who reads them from another machine all come up before any detail of one of them. Mark the ones someone could take up tomorrow. [`MAP.md`](MAP.md) shows how each lands as a ticket or as fog.
- **If every answer is already a ticket,** nothing is foggy, and the effort fits in one session without a map. Say so, and ask the person how they want to go on.

Then read [`MAP.md`](MAP.md), file the map issue and file each ticket under it, in dependency order so blockers have numbers before the tickets that wait on them. Finish by naming the map and the tickets that can start now, and tell the person to run `/wayfinder` on the map in a fresh session for each. Done when the map holds its destination and fog and every ticket has a parent, one type label, a `## Question` and its blockers.

## Work a map

Read the map's body only, and restate its destination to yourself before choosing anything.

**Pick.** The frontier is the map's open children that have no open blocker, no `claimed` label and no assignee. Take the one the person named, or else the earliest filed. Add `claimed` before doing anything else, so a parallel session passes over it. With an empty frontier, skip to Finish.

**Settle.** Follow the type table below. Read a related or closed ticket in full only when its answer bears on this one. The map's Notes hold the effort's domain and standing preferences.

**Leave the map truer.** In this order:

1. Comment the answer on the ticket and close it.
2. Add an entry under Settled: the title as a link, then a one-line gist.
3. Read the map again, since other sessions edit it, and apply the answer's effects:

   | The answer... | Edit |
   | --- | --- |
   | raises a new sharp question | File a ticket |
   | sharpens a patch of fog | File its ticket and delete that patch from Fog |
   | shows an open ticket lies past the destination | Close it and move it to Out of scope with the reason |
   | invalidates an open ticket | Rewrite or delete it |

**Finish.** The route is mapped when no ticket is open and Fog is empty. If it is not, name the tickets now on the frontier and stop. If it is, say so; when the destination was a spec or a plan to build, ask the person to run `/to-spec` in this same conversation, since it writes from the conversation held and the map is loaded here. A destination that was a single decision to lock ends here.

## Ticket types

The label carries the type; the body never does. Each example is from the notes-storage map.

| Label | Example question | Who supplies the answer | How |
| --- | --- | --- | --- |
| `wayfinder:research` | What does a GitHub issue comment cost us in size and rate? | You, reading sources | Call the Skill tool with "research" |
| `wayfinder:prototype` | When two workers post in the same second, which note counts as latest? | The person, reacting to something built | Call the Skill tool with "prototype" |
| `wayfinder:grilling` | Which notes must outlive the worker that wrote them? | The person, in an interview | Call the Skill tool twice, for "grilling" and "domain-modeling" |
| `wayfinder:task` | Seed a scratch repo with ten sample epics so the options can be tried | Either; the work, not an opinion, is the output | Do it, or give the person an exact checklist |

Where the person is the source of the answer, ask and wait. Never reply on their behalf. A task ticket exists only because a decision is blocked until it is done. These four skills are the only ones this skill calls.
