## What it does

`retro` reviews one coding session and suggests changes to the agent's environment, ranked by severity: a pointer in `CLAUDE.md`, a check that fails, a rule for the reviewer, a line to delete. It works from the session's own transcript, so every suggestion points at the moment in the session that prompted it.

It changes the environment rather than remembering the session. Nothing it suggests is a note for the agent to recall later. Each one changes a file, a check or a tool, so the next session cannot make the same mistake whether it remembers this one or not.

## When to reach for it

You type `/retro`, optionally naming an earlier session; the agent never starts it on its own. Use it after a session that went badly, or one that took far longer than the change deserved. A session that went smoothly rarely has much to offer. It is the learning loop for work without an Epic; for an Epic, [close-epic](close-epic.md) does the same from GitHub state, and the two write learnings in one format. `ask-spp` routes between every skill when the right one is unclear.

Before it suggests any change to a skill or an instructions file, it calls [writing-for-agents](writing-for-agents.md), which decides how such a document should read.

## What it looks for

| Lens | The session showed |
| --- | --- |
| Navigation pointers | the agent searched a long time for a file, or missed one that changes alongside it |
| Automated checks over written rules | a mistake a lint rule, hook or CI job could have caught |
| Reviewer rules | a judgement call the reviewer let through |
| Trimming `CLAUDE.md` | a line every session pays for that only some need |
| Tool economy | a call that returned far more than the agent used |
| No-ops | a steering line that changed nothing the agent did |
| Information access | the agent guessed because it could not see a log, a schema or a service's state |

It prefers a check to a written rule wherever a machine can tell right from wrong, because a check holds every time and a sentence in `CLAUDE.md` costs every session context and drifts out of date.

## Common questions

**Does it make the changes itself?**
No. It presents the list and stops. Deciding which mistakes deserve a permanent check takes judgement, and a check added carelessly can block good changes, so you pick each one.

**My session is long. Should I run it now or in a fresh session?**
Run it now if the session is still sharp, since the struggles are still in view. If it has grown too long to think clearly, start a fresh session and name the old one; `retro` reads the transcript from the harness's session store.

**Won't it invent generic advice to fill each lens?**
That is the risk to watch. Every suggestion must name its evidence from the transcript, a turn or a count. Drop any you cannot trace to a moment in the session, and treat the ranking as a first draft.

## It's working if

- Each suggestion names the moment in the session behind it and the file it would change.
- Mechanical mistakes come back as checks, not as new lines in `CLAUDE.md`.
- Some suggestions delete lines rather than add them.
- Nothing changed until you picked a suggestion.
