## What it does

`wayfinder` handles an effort larger than one agent session, where you can name the destination but cannot see the route. It charts the effort as a **map**, one GitHub issue labelled `wayfinder:map`, whose children are **decision tickets**: questions whose answers are decisions, not slices of a build. Each later session settles one ticket and writes the answer back onto the map.

It plans and never builds. A session settles exactly one decision and then stops, and nothing on the map constructs the destination itself. The map is mapped when no decision remains before building could start, and the next step is `/to-spec`.

## When to reach for it

Type `/wayfinder` yourself; the agent never starts it on its own. Give it a loose idea to chart a new map, or a map's issue number to settle one of its tickets.

The trigger is narrow: the work will not fit in one session, and the route is unclear. If a single conversation can settle it, use `/grill`.

| Your situation | Use |
| --- | --- |
| A change you can plan in one sitting | [grill](grill.md) |
| A big effort with the route still hidden | `/wayfinder` |
| A map with nothing left to decide | `/to-spec` in the same conversation |
| A plan where cited answers can stand in for yours | [auto-grill](auto-grill.md) |

wayfinder is the unknown-territory path, and it joins the Epic path at `/to-spec`. `ask-spp` routes between every skill when the right one is unclear.

## Prerequisites

The `wayfinder:` labels must exist in the repo. [setup-spp](setup-spp.md) creates them, so run `/setup-spp` first if they are missing.

## The map and the fog

The map is an index. Its body has five sections, and the detail of every decision stays on its ticket:

- **Destination**: what the effort is heading for, agreed before any ticket exists, since it sets the scope.
- **Notes**: the domain and any standing preferences.
- **Settled**: one entry per closed ticket, with its title linked and a one-line gist.
- **Fog**: decisions you can sense but cannot word yet.
- **Out of scope**: work past the destination, which stays closed.

A question is fog when you can only gesture at it, and a ticket once you can word it exactly, whether or not anyone can answer it yet. As tickets close, fog that sharpens becomes tickets, and the route comes into view.

## The four ticket types

Each ticket has one label that says how it settles.

| Label | Worked | Settled by |
| --- | --- | --- |
| `wayfinder:research` | Alone | [research](research.md), which writes a cited note |
| `wayfinder:prototype` | With you | [prototype](prototype.md), which builds something rough to react to |
| `wayfinder:grilling` | With you | [grilling](grilling.md) and [domain-modeling](domain-modeling.md), as an interview |
| `wayfinder:task` | Either | One piece of manual work a decision is waiting on |

A ticket worked with you settles only in conversation with you. A task ticket exists to unblock a decision and never to deliver part of the destination.

## Common questions

**Why does a session settle only one ticket?**
Each decision can change the ones after it. One ticket per session keeps the answer in front of you before the next question is framed, and it lets you run other sessions on other tickets in the meantime.

**The map is mapped. Why `/to-spec` and not implementation?**
The map holds linked decisions, which are not a plan to build. `/to-spec` turns them into a spec, and the rest of the Epic path takes it from there. Run it in the same conversation, because it writes from the conversation held.

**Can charting settle a ticket for me?**
No. A chart session writes the map and its tickets, settles none, and stops. Even a research ticket waits for a session of its own.

## It's working if

Watch one wayfinder session from outside and you should see:

- No pull request opens, and the branch you started on gains no commits. The one branch a session may push is `prototype/<slug>`, from a prototype ticket, and nothing ever merges it.
- On a work session, one child issue gains the `claimed` label first, then an answer comment, then closes. The map issue gains exactly one entry under Settled.
- A second session on the same map picks a different ticket and does not ask you again what the first one settled.
- After a ticket closes, you cannot find the same question under Fog and in an open ticket at once.
- The last message of a finished map names `/to-spec`. A map with tickets left names the ones that can start next instead.
