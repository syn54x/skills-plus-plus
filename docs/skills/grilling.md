## What it does

`grilling` is spp's interview for testing a plan, a design or a decision before work starts on it. The agent keeps asking until every choice in the plan has been made out loud, then restates the plan and waits for you to say that the restatement is what you mean.

Questions come in batches called Rounds. Each Round holds every question that can be answered now, and holds back any question whose framing would shift with an answer you have not given yet. Every question carries the agent's recommendation, so agreeing costs you one word and a Round can be answered by number. Anything the repo, its docs or a command can settle, the agent looks up itself; you are asked only for choices.

## When to reach for it

Type `/grilling`, or the agent starts it when a task fits: you ask to be grilled or to have your thinking challenged, or another skill needs an interview before it acts.

You will seldom type it. In a repo, use [grill](grill.md), which runs this interview and also keeps your glossary and ADRs up to date. Other spp skills that need an interview (auto-grill, triage, improve-architecture) start this one underneath. It opens the Epic path, ahead of to-spec. `ask-spp` routes between every skill when the right one is unclear.

## Rounds and the Frontier

The agent keeps a private tree of the plan's choices, with the choices that constrain others nearer the root. The **Frontier** holds the open choices that no other open choice could reframe. A **Round** asks the Frontier, then waits; your replies close some branches and open others, and the next Round asks whatever they made askable.

Here is the shape of a Round:

```markdown
**1. When is a ride's fare fixed?**
When the rider books, or when the car drops them off?
Recommended: at booking, so the rider accepts the fare before the car is sent.

**2. May a driver decline after accepting?**
Recommended: yes, until they set off, with the ride offered to the next driver.
```

A reply of "1 yes, 2 no: once accepted it is theirs" closes both choices, and the next Round starts from there.

## Common questions

**I would rather answer one question at a time.**
Say so in your own `CLAUDE.md` or `AGENTS.md`, for example "When grilling, ask one question per Round." Some people focus better on a single question, or prefer a slower pace in a second language, and the instruction is followed.

**If you ask several questions together, don't my answers lose their effect on the others?**
A Round only holds questions that cannot reframe each other, and every reply feeds the tree that the next Round is drawn from. When the agent misjudges and one answer should have changed a question beside it, point that out and the choice comes back in the next Round.

**It stopped asking and began writing code.**
It skipped the restatement it should have waited on. Smaller and lower-effort models skip it most often. A line in your own instructions saying that no plan is acted on until you approve it is the dependable guard.

**It made a choice for me.**
That is a failed run: facts are the agent's to find, and choices are yours. It shows up most when another skill started the interview to clear its own way and the agent took that as permission. When you want choices made for you from sources it can cite, auto-grill does that on purpose and lists each answer so you can overrule it.

**Is there a limit on how many questions it asks?**
No. A small plan may settle in a handful of questions and a large one may take dozens, and a limit would cut short exactly the plans that need the most care. Tell it to finish when you have heard enough. When an interview drags on, the subject is usually too large for one; split it.

## It's working if

- Each Round is a numbered list with a recommendation under every item, and you can answer it by number.
- No question in a Round depends on the answer to another question in the same Round.
- Later Rounds contain questions that only made sense once earlier replies were in.
- You are asked to choose, never to supply facts the repo already holds.
- At the end you get a short restatement of the plan and a request to confirm it, before anything is built.
