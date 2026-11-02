## What it does

`grilling` is the interview spp runs whenever a plan, a design or a decision has to be tested before anyone acts on it. It keeps asking until you and the agent understand the subject the same way, and it stops only when you confirm that you do.

It asks in rounds. One question at a time is slow, and every question at once asks things your earlier answers would have changed. So each round asks every question that is answerable now and nothing that depends on an answer you have not given yet. Each question comes with the agent's recommended answer, worded so that "yes" accepts it, which lets you answer a whole round by number. Anything the code or the docs can answer, the agent looks up instead of asking you.

## When to reach for it

Type `/grilling`, or the agent starts it when a task fits: you ask to be grilled or to have your thinking challenged, or another skill needs an interview before it can act.

You rarely type it. In a repo, [grill](grill.md) is the entry to use: the same interview, plus a glossary and ADRs written as the answers settle. Other spp skills that need an interview, such as auto-grill, triage and improve-architecture, run this one underneath. It sits at the head of the Epic path, ahead of to-spec. `ask-spp` routes between every skill when the right one is unclear.

## Rounds and the Frontier

The agent holds your subject as a design tree: each decision, with the decisions that depend on it below. The **Frontier** is every open decision whose prerequisites are settled. A **Round** asks the whole Frontier, then waits. Your answers settle some branches and open others, so the next Round asks what those answers made askable.

A Round looks like this:

```markdown
**1. Where does a split order get split?**
At checkout, when the customer pays, or at the warehouse, when it ships?
Recommended: at checkout, so the customer sees each delivery charge before paying.

**2. Can a customer cancel one Shipment of an order?**
Recommended: yes, until that Shipment is dispatched.
```

Answering "1 yes, 2 no: cancellation is per order" settles both and moves the Frontier.

## Common questions

**Can I have one question at a time instead?**
Yes. Put a line such as "When grilling, ask one question at a time" in your own `CLAUDE.md` or `AGENTS.md`. Some readers find a single question easier to focus on, or work in a second language and prefer the slower pace; the instruction is honoured.

**Doesn't asking a whole round at once lose the questions my answers would have raised?**
No, because a Round holds only questions that do not depend on each other. Every answer still shapes what comes next, since the agent works out the next Round from the updated tree. The judgement can slip: if one answer should have changed another question in the same Round, say so, and that branch is asked again.

**It ran out of questions and started building.**
It should have stopped and asked you to confirm first. Smaller or lower-effort models are the ones that skip the confirmation most. A line in your own `CLAUDE.md` saying not to start work on a plan until you approve it is the reliable guard.

**It answered its own questions.**
That is a failure of the run. Facts are the agent's to find; decisions are yours. It happens most when another skill runs the interview to unblock its own work and the agent reads that as leave to decide. If you want an interview answered on your behalf from citable sources, auto-grill does that deliberately and lists every answer for you to veto.

**Can I cap the number of questions?**
No. A plan may need three questions or fifty, and a fixed cap cuts the hard case short. Tell the agent to wrap up when you have heard enough, and accept the plan where it stands. A session that runs very long usually means the subject is too big for one; split it.

## It's working if

- Each Round arrives as a numbered list with a recommendation under every question, and you can answer it by number.
- No question in a Round needs another question in the same Round answered first.
- Later Rounds ask things the first Round could not have asked.
- You are asked for decisions, never for facts the code or the docs hold.
- It stops at the end and asks you to confirm the shared understanding before doing anything with it.
