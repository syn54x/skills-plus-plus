## What it does

`research` settles one question from the sources that hold the fact, and hands back a short note in which every claim is cited. A background agent does the reading, so your session keeps working while it reads.

The note always has the same five parts: the question, the answer, the sources with the dates they were read, a confidence level, and the open questions. The run is done when every claim in the answer carries a source or is marked `unverified`, which gives it a clear place to stop rather than reading until it runs out of patience.

## When to reach for it

Type `/research`, or the agent starts it when a task fits: a decision waits on an outside fact (how a library behaves at a given version, what a spec says, how other products solve the same problem), or another skill needs a cited answer before it goes on. auto-grill calls it when a question needs real reading, and wayfinder will call it for the research questions on its map.

| What you need | Use |
| --- | --- |
| A fact from outside the repo that a decision waits on | `research` |
| A choice made with you, by interview | [grill](grill.md) |
| A plan grilled with cited answers given for you | [auto-grill](auto-grill.md) |
| To try an approach against your own code | prototype |

`research` belongs to the planning end of the Epic path, and to unknown territory, where it feeds wayfinder. `ask-spp` routes between every skill when the right one is unclear.

## Primary sources

The skill's leading idea is the *primary source*: the thing that owns the fact. That means the project's own docs, its source code at a named version, the spec, the changelog, or the API itself when it can be called without side effects. A blog post or a forum answer can point the agent at a primary source, but it is never cited. When no primary source backs a claim, the claim stays in the note only with the label `unverified`, beside where the agent looked.

| Confidence | Means |
| --- | --- |
| high | Two independent primary sources agree, or the source code settles it, at the version in question |
| medium | One current primary source, with nothing against it |
| low | The answer leans on an `unverified` claim, conflicting sources, or an older version |

## Common questions

**Where does the note go, and should I commit it?**
It goes to the session scratchpad as `research-<slug>.md`, and the path comes back to you with the answer. A note is a snapshot of one day's sources, and a stale note in the repo misleads later readers, so commit only the conclusion: put it in an ADR, a spec or a Sub-issue that cites the note's sources.

**A second research agent appeared. Is that expected?**
No. The background agent is told to do the reading itself and start no agent of its own. Earlier versions of this skill did not say so, and users reported one research task running two or three times over. If you see a duplicate with a near-identical name, stop it.

**When does it stop reading?**
When every claim in the answer has a source or is marked `unverified`. A broad request such as "research authentication" never reaches that point cleanly, so ask something narrow enough to settle: a single API, behaviour or version.

**Who decides what counts as a primary source?**
The agent, by the rules above; there is no allowlist. Your check is the citations. Follow two of them, and if either lands on someone's summary rather than the docs, spec or source itself, the run failed.

## It's working if

- Your session keeps moving while the note is written, and one background task appears, not two.
- The note has all five parts in order, and you have its path.
- Each claim in the answer ends with a source number or `unverified`, and each source has a read date.
- Following any citation lands on official docs, a spec, a changelog or source code.
- The note alone is enough to settle the decision that was waiting on it.
