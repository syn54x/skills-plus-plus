## What it does

`auto-grill` puts your plan through the same interview as [grill](grill.md), except that the agent answers every question it can back with a citation on your behalf. You see only the questions that need you, plus a list of what it answered so you can overrule any of it.

The agent acts as your **Proxy**, and you are the **Principal**. For each question it checks four things in turn: what the code already does, what has already been decided (the glossary, the ADRs, the issues, and what you said earlier in the session), how established products solve the same problem, and finally whether the answer is right for the long run regardless of what it costs to build. Each question then gets exactly one outcome:

| Outcome | What you see |
| --- | --- |
| **Auto-answer**: the answer holds up and has a citation | One line on the veto list: question, answer, citation |
| **Challenge**: existing code or an earlier decision pins the question to an answer the agent rates lower | That decision, the answer it pins, the stronger option and what keeping things costs; you supersede or uphold it |
| **Escalation**: a preference, an open trade-off, or anything it cannot cite | The question with the agent's **Best fit** and its basis; you answer it |

A decision you made in the same session is never challenged. It counts as a citation, so questions it settles are answered from it.

## When to reach for it

You type `/auto-grill`; the agent never starts it on its own. Put the subject after the command, or type it alone to grill the plan already under discussion. It is a first step of the Epic path, an alternative to grill before to-spec.

| Your situation | Use |
| --- | --- |
| Most answers already sit in the code, the ADRs or the docs | `/auto-grill` |
| You want to answer every question yourself | [grill](grill.md) |
| You need one outside fact, not an interview | [research](research.md) |
| The effort is too large for one sitting | wayfinder |

`ask-spp` routes between every skill when the right one is unclear.

## Prerequisites

Nothing to prepare. The interview runs on [grilling](grilling.md), terms and ADRs are written by [domain-modeling](domain-modeling.md), design questions use the words of [codebase-design](codebase-design.md), and questions that need outside reading go to [research](research.md). The transcript is written to the session scratchpad, and the agent tells you its path once.

## The veto list

Every stop lists the auto-answers given since the previous stop, a line apiece under the Round that produced them. Read it as you would review a pull request: the agent did the work, and anything it got wrong is yours to overrule. An overrule replaces that answer and is treated as your own decision from then on. A Round with nothing that needs you goes straight on, and its lines wait for the next stop.

## How each choice is drawn

Every Escalation and Challenge opens with the question in one plain sentence. A drawing of the options comes next, then the Best fit and the reason for it. Each drawing shows one difference, uses real values (an amount, a row, a keystroke) and only names you already know, so you can judge it without holding the agent's working notes in your head.

In a terminal, the options are stacked under `A:` and `B:` labels, within 72 columns, with the Best fit marked:

```text
3. Challenge: should saving a profile go through the job queue?
   ADR 0004 sends every write through the queue, profile saves included.

   A: uphold, queue the save
      save profile  ->  queue  ->  worker  ->  db
      a failed save retries in the worker

   B: supersede, write directly   <- Best fit
      save profile  ->  db
      the queue stays for bulk imports

   Supersede or uphold? Best fit: B. Keeping ADR 0004 here costs a
   second retry path for one row.
```

The deciding difference sits on the first line of each option, where you read it first. In the Claude desktop app, where the agent can show visuals inline, each choice is drawn as rendered cards, a grid or a timeline, with a button per option that sends your answer. The transcript keeps the text form either way.

## Common questions

**Will it argue with a decision I have just made?**
No. Your answers, rulings and overrules from this session go on a list it cites from and never challenges. It can still challenge an older ADR, or the existing code, when either forces a worse answer.

**Can it overrule a library's documented behaviour because it prefers another design?**
No. An outside fact can be out of date but not outvoted. The agent re-checks one it doubts and cites the current state. Code in your repo is another matter: it records an earlier choice, so it can be challenged.

**Does it write the spec when the interview ends?**
No. It closes with the agreed restatement, the glossary entries and ADRs it wrote, and the transcript path, then asks you to run `/to-spec` in the same conversation.

## It's working if

- Each stop shows only Escalations, Challenges and the veto list, never a question it could have cited.
- Every line on the veto list names a file, an ADR, an issue, a research note or something you said.
- Every Escalation comes with a Best fit and the one sentence it rests on.
- You can tell what each choice is about from its opening sentence, and no drawing wraps or needs a question number to read.
- Nothing you decided earlier in the session comes back as a Challenge.
- It ends by asking you to run `/to-spec`, rather than writing the spec itself.
