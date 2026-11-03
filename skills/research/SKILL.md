---
name: research
description: Answer a question from primary sources, with a background agent writing a cited note. Use when the user asks for research, or a decision waits on how a library, API or spec behaves.
metadata:
  credits:
    - skill: research
      author: Matt Pocock
      url: "https://github.com/mattpocock/skills/tree/main/skills/engineering/research"
---

Answer one question from the sources that own the facts, and hand back a note in which every claim can be traced. The reading runs in one background agent, so the work that asked can carry on.

## 1. Frame the question

Write the question as a single sentence the note can answer: a value, a yes or no, or a short list. Beneath it, write what the caller already knows (so the agent does not find it again) and which decision the answer feeds (so the agent knows when it has enough). A request that holds two questions becomes two runs.

Pick the note's path: `research-<slug>.md` in the session scratchpad. The note records what held on the day it was read, so it stays out of the repo; a caller that needs it later cites the path or copies the answer.

## 2. Start one agent

Start one background agent with read-only tools when the harness offers that choice, and hand it the question, the context from step 1, the path, and the rest of this file from **Sources** down. The agent does the reading itself and starts no agent of its own. When no background agent is available, or you already are one, do the reading inline by the same rules.

Go back to the work that asked. Wait for the note only when that work cannot move without it.

## Sources

- **Primary or nothing.** Cite what owns the fact: the project's own docs, its source code at a named version, the spec or RFC, release notes and changelogs, or the API itself when it can be called without side effects. A blog post, forum answer or summary is a lead that points to a primary source, never a citation.
- **Dated.** Each source carries the date it was read and, where it has one, the version or date it describes. A fact about a library is a fact about one version of it.
- **Disagreement stays visible.** When two primary sources conflict, cite both in the answer and put the conflict under Open questions.
- **Unverified is a label, not a gap.** A claim that no primary source backs stays in the note only marked `unverified`, followed by where you looked.

Stop reading when the done condition below holds. Breadth past the decision the answer feeds costs time and adds nothing the caller can use.

## The note

Write the note in this shape and this order:

```markdown
# <the question, as framed in step 1>

## Answer

<two to six sentences. Every claim ends with its source number, like [2], or with `unverified`.>

## Sources

1. <title>, <URL or repo path with version>. Describes <version or date>; read <YYYY-MM-DD>.

## Confidence

<high | medium | low>: <one sentence on why>.

## Open questions

- <what the sources left unsettled, or "none">
```

Confidence follows the sources:

| Level | When |
| --- | --- |
| high | Two independent primary sources agree, or the source code itself settles it, at the version in question. |
| medium | One primary source, current, with nothing contradicting it. |
| low | The answer leans on an `unverified` claim, on sources that conflict, or on a version older than the one in question. |

## Done when

- Every claim in Answer ends with a source number or `unverified`.
- Every source has a read date, and every source cited in Answer is listed under Sources.
- The note is at its path, and the caller has that path, the answer in one line and the confidence level.
