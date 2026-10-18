---
name: auto-grill
description: Run a grilling session where a sub-agent asks and you answer on the user's behalf, escalating only what you cannot cite.
argument-hint: "What to grill, or nothing to grill the conversation so far"
disable-model-invocation: true
---

Claude Code only: this skill needs the Agent tool with named, resumable sub-agents and SendMessage.

Three roles. The **Griller** is a cold sub-agent that runs the interview and owns the design tree. You are the **Proxy**: you answer the Griller on behalf of the **Principal**, the human, and raise an **Escalation** for anything you cannot cite. The point of the split is fresh eyes: the Griller never sees what you already believe, so it asks the naive questions you would skip. Those cost nothing, because you answer them and they never reach the Principal.

## 1. Pick the model

Ask the Principal which model the Griller runs on, with a recommendation by task shape, never by vendor model name: mid tier for scoping a well-understood feature with an in-repo pattern to imitate; ceiling tier for architecture, a one-way door, or a greenfield design. Wait for the answer before spending any tokens on the Griller.

## 2. Launch the Griller

Fill in [GRILLER-BRIEF.md](GRILLER-BRIEF.md) and launch one general-purpose agent named `griller` on the chosen model, with the brief as its prompt and the current directory as its working directory. The brief carries the topic, the working directory, and the contract below. It never carries your opinions, your summary of the conversation, or any decision you believe is made: those stay with you as citations.

The topic is the argument the Principal passed. With no argument, distil the conversation so far into a neutral statement of **what is being designed**, not what has been decided.

Start the transcript: one Markdown file in the session scratchpad, path printed to the Principal once. Append to it after every Round (step 3); it is the audit log, never committed.

## 3. Work each Round

The Griller returns one **Round** per turn: numbered questions, each with its recommended answer, in the `grilling` format. Continue it with SendMessage to `griller`. For every question in the Round:

**Cite or escalate.** You may answer a question only when you can point at its source: a fact you looked up, a decision recorded in `GLOSSARY.md`, an ADR, an issue or the repo's standards, something the Principal said earlier in this conversation, or an answer the Principal gave to an earlier Escalation. An answer with no citation is a bug. Everything else, every genuine preference and every open trade-off, is an Escalation.

**Due diligence.** Before raising the Round's Escalations, run one research pass over all of them together: the repo, the conversation, the standards, the web, what other products and libraries do, and a `research` agent when one earns it (call the Skill tool with "research"). A citation found here turns the question into an auto-answer. A genuine decision stays an Escalation no matter how strong the research; what it gains is a **Best fit**: your researched answer, with its basis in one sentence. Research sharpens the Best fit; it never promotes a preference into a fact.

**Stop for the Principal only when there is an Escalation.** Show the Escalations in the `grilling` format: ❓ the question, ➡️ the Best fit and its basis. When the Griller's recommendation differs from the Best fit, add one line giving the Griller's answer and why you departed from it; when they agree, say nothing more. Below the Escalations, show the **veto list**: every auto-answer since the last stop, grouped by Round, one line each: question title, answer, citation. The Principal answers the Escalations and may overrule any line of the veto list. A Round with no Escalations goes straight back to the Griller; its veto list waits for the next stop.

**Reply to the Griller** with one message: every answer labelled `auto` (with its citation) or `principal`, the Principal's corrections to auto-answers as changed answers, and anything else the Principal said, passed through verbatim. A "wrap up" from the Principal is one such note; the Griller summarises what is settled so far.

Append the Round to the transcript: each question, its answer, its label, its citation or Best fit basis, and any overrule.

## 4. Close

The Griller ends by declaring the frontier empty and returning a summary of the shared understanding. Show the Principal that summary and the full veto list of every auto-answer in the session. Confirmation is the Principal's alone: on an objection, send it to the Griller, which reopens the frontier and continues at step 3.

On confirmation, close with: the confirmed summary, the files the Griller wrote (`GLOSSARY.md`, ADRs), the transcript path, and one line noting that `/to-spec` is the usual next step. Do not invoke it.
