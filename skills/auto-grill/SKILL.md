---
name: auto-grill
description: Interview my plan while you settle, with a citation, every question the code, the record or the industry already answers, and bring me only the rest.
disable-model-invocation: true
---

Run a grilling interview in which you stand in for the person. In this skill you are the **Proxy**, and whoever started it is the **Principal**. You settle each question that a citable source already settles, and you bring the Principal three kinds of thing only: **Escalations**, **Challenges**, and a veto list of the answers you gave in their name.

## 1. Before the first Round

- Call the Skill tool twice, for "grilling" and "domain-modeling". `grilling` drives the interview with a single change, which the Principal requested by starting this skill: each Round reaches you before it reaches them, and its Wait step holds only for what step 2 leaves open. `domain-modeling` runs alongside, writing down each term and lasting decision as soon as it is agreed.
- Once a question turns on how code is shaped (an interface, the placement of a seam, what a module conceals), call the Skill tool with "codebase-design"; its vocabulary holds from that Round onward.
- The subject is the text after `/auto-grill`. If there is none, state what the conversation is designing, phrased as open choices rather than conclusions.
- Open a transcript, `auto-grill-<slug>.md`, in the session scratchpad and print its path for the Principal once. It logs the session for audit and stays out of git.
- Start the **session list**: each decision the Principal takes during this session, beginning with any they took in the conversation before the skill started. Their Escalation answers, Challenge rulings and overrules join it as they come.

## 2. Work a Round

### Draft before you dig

Write out the whole Frontier, with a recommendation on each question, before researching any of it. Keep the questions that seem decided already: each costs one veto line, while dropping it leaves an untested assumption standing.

### Four passes

Batch each pass over the Round, so that one lookup can feed many questions.

1. **The code.** What the repository does today that settles or narrows the answer.
2. **The record.** Earlier deliberation: the glossary, every ADR, the issue history, written standards, and the session list.
3. **The industry.** What mature libraries and products do about the same problem, read from their own docs and code. For a question that needs real reading, call the Skill tool with "research" and cite the note it gives back. An answer that parts ways with common practice says so and gives its reason.
4. **Question it.** Treat what passes 1 to 3 found as candidates. Ask which answer you would choose if building it cost nothing and it had to last: saved effort never justifies an answer, and neither does a shortcut that is cheaper today. Put every design answer through the `codebase-design` tests; failing any one disqualifies it, no matter what backs it.

### Pick one outcome

| Outcome | Use it when | It carries |
| --- | --- | --- |
| **Auto-answer** | The answer comes through pass 4 intact and you can point to its source: a file and line, an ADR, a glossary entry, an issue, a research note or the session list. | That pointer, plus a pointer for the reason whenever it departs from common practice. |
| **Challenge** | Existing code or a prior decision pins the question to an answer pass 4 rates lower, and you know the stronger answer. | The prior decision, the answer it pins, the stronger alternative, and the price of leaving things as they are. |
| **Escalation** | Everything left: taste, trade-offs still open, a departure from practice whose reason nobody wrote down. | A **Best fit** and the single sentence it rests on. |

- **The session list is never challenged.** The Principal settled those entries in this sitting, aware of the trade-off; answer from them as auto-answers.
- **Facts about the outside world are never challenged.** A library's capability or an API's behaviour can go stale but cannot be outvoted: check again any you doubt and cite the current state. Code in this repository is different, since it records an earlier choice, and a Challenge may question it.
- **Nothing uncited is auto-answered.** Without a pointer, the question becomes an Escalation.
- **The Best fit is advice.** Research makes it sharper; it never makes taste into fact. For an Escalation between interfaces, produce rival designs the way `codebase-design` describes, and choose by depth, locality and where the seam falls.

### Present a stop

When the Round produced neither an Escalation nor a Challenge, begin the next Round at once and hold its veto lines for the next stop. Otherwise present, in order:

1. **Escalations**, laid out as `grilling` lays out its items, with the Best fit as option `A:`, marked `<- Best fit` on its label in place of `(recommended)`, and its basis on the `Rests on:` line. When the Best fit departs from what comparable products do, one more line says what they do; when research changed your drafted recommendation, one more line says why.
2. **Challenges**: the prior decision and the answer it pins, then `Supersede or uphold?` with the stronger alternative and the price of keeping the decision.
3. **Veto list**: one line per auto-answer since the previous stop, as a single list across the stop, even when it holds lines from more than one Round. Each line opens with a handle, `V1`, `V2` and so on, numbered down the whole list, and the lines that depart from common practice come first, whatever their Round. Each line then names its Round, the question, the answer, the pointer, and for a departure from practice, the common approach beside the cited reason for leaving it. The veto list stands in for the list of what the record settled that `grilling` puts under its questions, so a stop never shows both.

Draw each Escalation and Challenge as **Draw the choice** says. Then wait. The Principal answers the Escalations, rules on each Challenge, and can strike any veto line by its handle: "strike V3" is a complete reply. A reply of `all` takes the Best fit on every Escalation only; each Challenge still needs its own "supersede" or "uphold".

### Draw the choice

Each Escalation and Challenge reads in this order: the question in one plain sentence, a drawing of the choice, then the Best fit and what it rests on. A Challenge draws the design that keeps the decision and the one that drops it. A name or a yes-or-no question needs no drawing.

- **One difference per drawing, shown with real values**: an actual row, amount, keystroke or call, picked so the options visibly part ways. Show how a caller writes each API option, old and new snippets when behaviour changes, and a table when the options differ on several axes.
- **Only names the Principal already knows.** Question numbers, invariant ids, story and ticket numbers and your own working terms stay in the prose. Name anything else in the sentence above the drawing.
- **The deciding difference comes first** in each option, never last in a column. A second rule that rides on an option gets its own sentence under the drawing.
- **One meaning per arrow** within a drawing.

When you can show a visual inline in the conversation, draw the choice there: a card per option with the Best fit marked, a grid when cases meet options, a timeline when the options differ in when something happens, and on each option a button that sends it as the Principal's answer, in the letter form a typed reply uses (`1B`). The plain sentence stays in prose directly before each drawing and the Best fit directly after it, and the transcript gets the text form. On Claude Code, [`CLAUDE-CODE.md`](CLAUDE-CODE.md) names the tool; read it before the first stop.

Otherwise draw in text, which renders in a terminal: Markdown and ASCII, never a diagram language. Stack the options under labels `A:` and `B:`, mark the Best fit on its label (an Escalation's Best fit is always `A:`; a Challenge keeps uphold as `A:` and supersede as `B:`), and keep every line within 72 characters. Never set options side by side in columns, which wrap on a narrow screen.

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

### Close the Round

- Label each answer in the tree: `auto` with its pointer, or `principal`. A struck veto line is replaced by what the Principal said.
- An upheld Challenge becomes a `principal` answer pointing at the decision; a superseded one becomes a `principal` answer naming the decision it retires. Every `principal` answer goes on the session list.
- When `domain-modeling` writes a decision, `principal` outranks `auto`. If a `principal` answer retires a recorded decision, write a fresh ADR and mark the earlier one as superseded by it.
- Add this Round to the transcript: questions, answers with labels, pointers or Best fit bases, Challenges with their rulings, and overrules.

Recompute the Frontier and run the next Round. When the Principal says to wrap up, jump to step 3 with whatever is settled.

## 3. Finish

Once the Frontier is empty, first show any veto lines held since the last stop, in the full form step 2's veto list uses, and the Principal can strike any of them. Then give the restatement `grilling` ends with, drawing only the settled design's moving part (a sequence, or the split a decision makes) by the rules in **Draw the choice**, with the rest as a list in words. Auto-answers already shown at an earlier stop are not repeated: the restatement's record lines, each with its pointer, cover them. The Principal alone confirms; a struck veto line or any other objection puts questions back on the Frontier and returns you to step 2.

After confirmation, report the confirmed restatement, every file written (glossary entries and ADRs, superseding ones included), where the transcript is, and a line recommending `/to-spec` in this conversation as the next step. That skill is the Principal's to run: ask them to, and leave it unstarted.
