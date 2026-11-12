## What it does

`grilling` is spp's interview for testing a plan, a design or a decision before work starts on it. The agent keeps asking until every choice in the plan has been made out loud, then restates the plan and waits for you to say that the restatement is what you mean.

Questions come in batches called Rounds. Each Round holds every question that can be answered now, and holds back any question whose framing would shift with an answer you have not given yet. Every question lists its options under letters, with the agent's recommendation first, so a whole Round can be answered in one short line. Anything the repo, its docs or a command can settle, the agent looks up itself and lists under the questions with its source; you are asked only for choices.

## When to reach for it

Type `/grilling`, or the agent starts it when a task fits: you ask to be grilled or to have your thinking challenged, or another skill needs an interview before it acts.

You will seldom type it. In a repo, use [grill](grill.md), which runs this interview and also keeps your glossary and ADRs up to date. Other spp skills that need an interview (auto-grill, triage, improve-architecture) start this one underneath. It opens the Epic path, ahead of to-spec. `ask-spp` routes between every skill when the right one is unclear.

## Rounds and the Frontier

The agent keeps a private tree of the plan's choices, with the choices that constrain others nearer the root. The **Frontier** holds the open choices that no other open choice could reframe. A **Round** asks the Frontier, then waits; your replies close some branches and open others, and the next Round asks whatever they made askable.

Here is the shape of a second Round:

```markdown
**What I took from your last replies**
- Cancellations are free only until the driver sets off.

Settled 3 · asking 2 · held back: tipping.

**1. When is a ride's fare fixed?**
A (recommended): when the rider books.
B: when the car drops them off.
Rests on: riders wanting to accept a price before a car is sent.

**2. May a driver decline after accepting?**
A (recommended): yes, until they set off, with the ride offered to the next driver.
B: no, once accepted the ride is theirs.
Rests on: a decline before setting off costing the rider no waiting time.

**Settled from the record**
- Fares are stored in cents (`src/fare.ts`).

Answer with letters, such as `1A 2B`, or `all` to take every recommendation. A caveat can follow any letter.
```

The Round opens by reading back the replies that changed the plan, so a misreading is caught before it spreads, and then says how far the interview has got. The `Rests on:` line names what each recommendation assumes, so when the assumption is wrong you can say that instead of arguing the option. A reply of "1A, 2B but only at night" closes both choices, the caveat comes back in the next Round's read-back, and the next Round starts from there.

## The restatement

When every choice is settled, the agent restates the plan as a list, and each line ends with where it came from: you (with the Round and item), the record (with a pointer such as an ADR), or the agent's own inference. The inferred lines come last under their own label. Nobody decided those, so they are the ones to check before you confirm.

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

- Each Round is a numbered list whose options sit on lettered lines, the recommended one first, each item with a `Rests on:` line, and you can answer it with `1A 2B` or `all`.
- Every Round after the first opens by reading back your replies that changed the plan, caveats included, and says how many choices are settled and which are held back.
- No question in a Round depends on the answer to another question in the same Round.
- Later Rounds contain questions that only made sense once earlier replies were in.
- You are asked to choose, never to supply facts the repo already holds, and each fact the agent looked up is listed with its source.
- At the end you get a short restatement of the plan, every line marked with its source and the inferred ones last, and a request to confirm it before anything is built.
