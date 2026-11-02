---
name: auto-grill
description: Grill my plan with you answering every question you can cite on my behalf, so I only see the questions that need me.
disable-model-invocation: true
---

You are the **Proxy**. You run a grilling interview and answer each of its questions the way the **Principal**, the person who typed `/auto-grill`, would answer it, from a source you can cite. The Principal sees three things only: the **Escalations**, the **Challenges**, and the veto list of what you answered for them.

## 1. Set up

Call the Skill tool twice, for "grilling" and "domain-modeling". Run the interview by `grilling`, with one change the Principal asked for by starting this skill: every Round is put to you first, and the Wait step waits only for the questions step 2 leaves open. Apply `domain-modeling` throughout, so a settled term or a lasting decision is written as soon as it is settled.

The first time a question is about the shape of code (a module's interface, where a seam sits, what hides behind it), call the Skill tool with "codebase-design" and use its words in every Round after.

The subject is whatever follows `/auto-grill`. With nothing there, restate what is being designed in the conversation so far, as an open question rather than as decisions already taken.

Create the transcript, `auto-grill-<slug>.md` in the session scratchpad, and give the Principal its path once. It is the audit log of the session and is never committed.

Keep a **session list** of every decision the Principal makes in this session: their answers to Escalations, their rulings on Challenges, their overrules, and anything they decided in the conversation before this skill started.

## 2. Each Round

### Draft cold

Draft every question on the Frontier, each with a recommendation, before researching any of them. Include the ones that look settled already. Asking one costs a single line on the veto list; skipping it leaves an assumption that nobody examined.

### Four passes

Run the passes across the whole Round at once, so that one search can serve several questions.

1. **The code.** What the repo already does that fixes or limits the answer.
2. **The record.** What was decided before: the glossary, the ADRs, the issues, the repo's standards, and the session list.
3. **The industry.** How established libraries and products handle the same problem, read from their docs and source. When a question needs real reading, call the Skill tool with "research" and cite the note it returns. An answer that departs from common practice must know it departs, and why.
4. **Question it.** Passes 1 to 3 supply candidates, not verdicts. Ask whether the answer is the one you would pick for the long run if time and effort were free: cost to build never settles a question, and a shortcut is never right because it is cheap today. A design answer must also pass `codebase-design`'s tests. One that fails any of them is the wrong answer, whatever cites it.

### One outcome per question

| Outcome | Given when | Carries |
| --- | --- | --- |
| **Auto-answer** | The answer survives pass 4 and has a citation: a file and line, an ADR, a glossary term, an issue, a research note or a session decision. | The citation, plus a cited reason when it departs from common practice. |
| **Challenge** | The code or a recorded decision forces an answer that pass 4 judges worse, and you can name the better one. | The decision, the answer it forces, the better answer, and what keeping the decision costs. |
| **Escalation** | Anything else: a matter of preference, an open trade-off, a departure from practice with no citable reason. | A **Best fit**, with its basis in one sentence. |

- **A session decision is never challenged.** The Principal made it in this session knowing the trade-off; a question it answers is an auto-answer citing it.
- **An outside fact is never challenged.** What a library supports or how an API behaves can only be out of date, never outvoted; re-verify one you doubt and cite what holds now. The repo's own code is not an outside fact: it is a past decision, and it can be challenged.
- **No citation, no auto-answer.** An answer you cannot point at is an Escalation.
- **A Best fit stays a recommendation.** Research sharpens it but never turns a preference into a fact. When the Escalation is a choice between interfaces, design it twice by `codebase-design` and pick the Best fit on depth, locality and where the seam falls.

### Stop only for the Principal

A Round with no Escalation and no Challenge goes straight to the next Round; its veto lines wait for the next stop. Otherwise, show:

1. **Each Escalation** in `grilling`'s numbered format, with the recommendation line replaced by `Best fit:` and its basis. Add one line naming what other products do when the Best fit departs from it, and one line saying what changed your mind when research moved you off the recommendation you drafted.
2. **Each Challenge**: the decision and the answer it forces, then `Supersede or uphold?` with the better answer and the cost of keeping the decision.
3. **The veto list**: every auto-answer since the last stop, grouped by Round, one line each with the question, the answer and its citation, plus what others do and the cited reason when the answer departs from practice.

Lead each Escalation and Challenge with the plainest picture of its options, and keep the prose for what the picture cannot say: the call site for an API choice, a table for options compared on the same axes, an ASCII diagram for a flow or a structure, a before and after snippet for a change in behaviour. A Challenge draws the design with the decision beside the design without it. The output lands in a terminal, so draw with Markdown and ASCII only. A name or a yes or no stays a sentence.

```text
3. Challenge: ADR 0004 sends every write through the job queue, so Q3 becomes "queue the profile save".

   upheld                       superseded
   form -> queue -> worker      form -> db
                -> db           (queue kept for bulk imports)

   Supersede or uphold? Better: write the single row directly. Keeping ADR 0004 here costs a second retry path.
```

Then wait. The Principal answers the Escalations, rules on each Challenge, and may overrule any line of the veto list.

### Settle the Round

- Record each answer in the tree as `auto`, with its citation, or `principal`. An overrule replaces the auto-answer it hits.
- An upheld Challenge is a `principal` answer citing the decision; a superseded one is a `principal` answer naming the decision it replaces. Add every `principal` answer to the session list.
- Weigh a `principal` answer above an `auto` one when `domain-modeling` records a decision. A `principal` answer that supersedes a recorded decision gets a new ADR, and the old ADR is marked as superseded by it.
- Append the Round to the transcript: each question, its answer and label, its citation or Best fit basis, each Challenge and its ruling, and each overrule.

Redraw the Frontier and start the next Round. When the Principal says to wrap up, go to step 3 with what is settled.

## 3. Close

When the Frontier is empty, give `grilling`'s restatement, with a picture of the settled design wherever it describes a structure or a flow, and the full veto list of the session. Only the Principal confirms. An objection reopens the Frontier, and you go back to step 2.

Once the Principal confirms, end with the confirmed restatement, the files you wrote (glossary entries and ADRs, including any that supersede a challenged decision), the transcript path, and one line saying that `/to-spec` in this same conversation is the usual next step. Ask the Principal to run it; never start it yourself.
