---
name: discuss
description: Talk a vague idea over before it is a plan. Use when the user wants to brainstorm, discuss, explore or kick around an idea, or says they are not ready to plan it.
metadata:
  credits:
    - skill: brainstorming
      author: Jesse Vincent
      url: "https://github.com/obra/superpowers/tree/main/skills/brainstorming"
    - skill: ce-ideate
      author: Kieran Klaassen and Trevin Chow
      organisation: Every
      url: "https://github.com/EveryInc/compound-engineering-plugin/tree/main/skills/ce-ideate"
    - skill: openspec-explore
      author: OpenSpec Contributors
      organisation: Fission AI
      url: "https://github.com/Fission-AI/OpenSpec/tree/main/skills/openspec-explore"
---

A discussion of an idea that is not a plan yet. You are the colleague who has read the code and has opinions: you bring versions of the idea, objections to it and what already exists, and the person reacts. The discussion settles nothing. Settling belongs to the interview that may follow, and this is the optional step before it.

## Before the first turn

The subject is the text after the command, or else the idea already under discussion in the conversation.

Read what the idea touches: the code, the glossary, the ADRs, and the issues on the Issue tracker. Anything they hold is a fact, and facts are looked up, never put to the person: whether a module exists, what a term means here, whether someone already filed this.

Done when you can say what the repo already holds that bears on the idea, or that it holds nothing.

## A turn

Every turn brings material: something about the idea that the person did not have before reading it, written as statements they can push against.

A turn holds one question at most, placed last, and only when the answer would change where the discussion goes next. A turn with no question is a good turn. Choices are not collected here, so a turn never holds a numbered list of decisions; a choice the talk turns up waits for **Still open** in the closing restatement.

Speak in one voice that has heard every reply. Start no persona agents. The only helper is the background agent that `research` starts for Survey.

## The four moves

Make them in whatever order the conversation calls for, one or two to a turn.

| Move | What you bring |
| --- | --- |
| **Widen** | A far-out version of the idea |
| **Test** | An objection or boundary case that would break it |
| **Survey** | What exists today, in the repo and outside it |
| **Shrink** | The smallest version that still matters, including doing nothing |

Survey has two halves. Inside the repo it is plain reading, mostly done before the first turn. For what exists outside the repo, Call the Skill tool with "research", and give it a question whose answer is a short list. The note is written in the background, so carry on with the other moves and bring its findings in when it lands.

The person may wave a move off, and a move waved off counts as made.

## Closing

Offer to close once each of the four moves has been made or waved off. Close whenever the person says to, whatever is left. When the idea turns out to be a plan already (the person knows what they want built, and only its choices are left), say so and ask the user to run `/grill`.

Close with a restatement in five parts, in this order:

1. **The idea now.** The idea as it stands after the discussion, in two or three sentences.
2. **Ruled out.** Each direction that was dropped, with its reason in one line.
3. **Still open.** The choices nobody made.
4. **Already exists.** The prior art, with the path of the research note.
5. **Suggested route.** One route from the table below, with the fact that picks it.

| Route | The fact that picks it |
| --- | --- |
| `/grill` or `/auto-grill` | One sitting can settle every decision |
| `/wayfinder` | One sitting cannot |
| `prototype` | Talk has not settled a design question |
| Park | The idea is worth keeping, and its time is not now |
| Drop | The idea is not worth the work |

Name one route and start none: the next step is the person's to take. `/grill`, `/auto-grill` and `/wayfinder` are commands only a person can run, so ask the user to run the one you named.

## What it writes

Nothing: no file, no glossary term and no ADR. Recording belongs to the interview `/grill` runs, which reads this conversation and its restatement.

A parked idea is the one exception. Offer to file the restatement as one issue, and file it only on the person's yes. The issue opens with a line saying an AI wrote it, and it gets no Triage role, so triage finds it in its queue.

## Done when

- Every turn brought material and held at most one question.
- Each move was made or waved off, or the person closed early.
- The restatement has its five parts in order and names one route.
- No skill was started except `research`, and nothing was written except a parked issue the person said yes to.
