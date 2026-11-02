## What it does

`writing-for-agents` is spp's guide to documents whose reader is an agent: skills, `CLAUDE.md` and `AGENTS.md` files, specs, prompts. A document written to it gets followed the same way every time the agent runs it.

Most of its advice is to cut. When one agent writes instructions for another, the draft is mostly explanation of things the model knew before it started reading. Those sentences are paid for in context on every run and change nothing the agent does. The guide supplies a test for spotting them, so it earns its keep on a document you already have as much as on a new one.

## When to reach for it

Type `/writing-for-agents`, or the agent starts it when a task fits: writing, editing or shortening a skill or an instructions file, a skill that has grown past its size budget, or an agent that follows a document one way on one run and another way on the next.

Start it yourself for anything else an agent will act on, such as a spec, a Sub-issue or the prompt for an unattended run. When the reader is a person, [writing-for-humans](writing-for-humans.md) applies instead. The `retro` skill calls this one before suggesting a change to any skill or instructions file. `ask-spp` routes between every skill when the right one is unclear.

## The two loads

The guide is built on one observation: each line you write is paid for from one of two budgets.

- **Context load**: whatever the agent carries on every turn, such as each line of `CLAUDE.md` and the description of each skill it can start unprompted.
- **Cognitive load**: whatever you have to keep in your head, namely which documents exist and when each is needed. You act as the index, and that is what keeping control costs.

Nearly every choice in writing for an agent is that trade in another form: inline a passage or put it behind a pointer, split a skill or leave it whole, let the agent start a skill or reserve it for yourself.

## The levers

- **Context pointers.** A line naming material held elsewhere and the moment to fetch it. How it is worded decides whether the agent fetches it.
- **Progressive disclosure.** What every run needs stays in the main file. What only some runs need goes in a reference file, linked from the step that uses it.
- **Completion criteria.** Every step finishes on a condition the agent can see is met, which stops it from moving on early.
- **Leading words.** A short term the model already understands (*red*, *tight*, *tracer bullet*) that stands for a whole behaviour.
- **Pruning.** Each meaning stated in exactly one place, and every sentence put to the no-op test.

Skills carry two extra laws. The size budget caps `SKILL.md` at 12 KB, the description at 1,024 characters and each reference file at 20 KB. The portability law keeps harness-only features at the edges, has skills name capabilities rather than a harness's tools (the line that calls another skill is the one exception), and puts each harness's specifics in a single reference file that only that harness reads.

## Common questions

**Is the agent the writer here?**
No, the agent is the reader and you are the writer. That is the hard part: your reader already knows nearly everything, so any explaining is wasted and only precision helps.

**Why not have the agent write the document?**
Nothing stops you, but expect a long draft. Unprompted, the model explains what it already knows and never asks whether a sentence changes its own behaviour. Let it draft, then review the draft against the guide; the review is where the gain is.

**An agent shortened my document and broke what it did. Why?**
An agent told to shorten optimises the one thing it can see, which is length. The no-op test measures behaviour instead: take the sentence out and ask whether the agent would now act differently. If it would not, remove the sentence entirely. If people disagree, run the document and watch.

**Does this belong in `CLAUDE.md`?**
Only if it is worth its context load. Every session reads `CLAUDE.md`, so a rule needed in one session in ten is paid for in all ten. Placed behind a pointer, it costs a single line until a session needs it.

**How do I phrase a rule for `CLAUDE.md` or `AGENTS.md`?**
Open with when it applies, follow with the check that shows it is satisfied, and end with the incident that prompted it, if any. "Before adding a migration that alters a table of over a million rows, write it as an online migration" gives the agent a moment to act. Told as the story of the outage, the same rule gives it none.

**Why the 12 KB limit on a skill?**
When a session is compacted, Claude Code re-attaches only about 5,000 tokens of each skill and silently drops anything after that. Keeping `SKILL.md` under 12 KB keeps it whole, and the longer detail lives in reference files read at the step that needs them.

**My skill only handles the task I first wrote it for.**
A skill written up from one finished run inherits that run's repo, files and examples. Treat the run as evidence, remove what was particular to it, and write for the whole class of task.

## It's working if

- Each revision makes the document shorter and better at once.
- A leading word visibly changes what the agent does in several places.
- Every meaning appears once, and only once.
- What a single path needs lives behind a pointer rather than in the main file.
- A skill passes the size check, and apart from the line that calls another skill, the only file naming a harness tool is that harness's reference file.
