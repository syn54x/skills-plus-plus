## What it does

`writing-for-humans` is the style guide spp applies to everything a person reads: docs pages, docstrings, release notes, pull request bodies, and comments on issues and Epics. It opens with a four-question checklist, followed by 25 numbered rules, and every rule states why it exists.

The agent uses it twice: once while drafting, then again on the finished draft, rule by rule. That second pass is where it pays off. An agent's unguided prose is usually correct but follows a stock pattern: it sets the scene before defining anything, gives two examples where one is enough, writes headings that sound like taglines, and drops code blocks in with no word on what to notice. The rules are distilled from the documentation of projects people praise for theirs (Django, pandas, Pydantic, FastAPI, Tailwind, MkDocs, visx, Zensical) and from Diátaxis, Rust RFC 1574 and Google's developer style guide, so a checked draft gets better without new facts.

## When to reach for it

Type `/writing-for-humans`, or the agent starts it when a task fits. Other skills call it right before they write prose:

| Skill | Calls it |
| --- | --- |
| `pr` | Before writing a pull request body |
| `implement-issue` | When a Sub-issue changes a docs page or a docstring |
| `close-epic` | Before posting the Epic's summary comment |
| `prepare-release-notes` | Before drafting the release highlights |

Start it yourself for any other text meant for people. If an agent is the reader (a skill, a `CLAUDE.md`, a spec), [writing-for-agents](writing-for-agents.md) is the one you want. `ask-spp` routes between every skill when the right one is unclear.

## The four kinds

Its first question is which **kind** of page you are writing, because a page serves one purpose only:

| Kind | The reader wants |
| --- | --- |
| Tutorial | To learn by building something |
| How-to | The steps to a goal they already have |
| Reference | Facts, organised the way the product is |
| Explanation | Why it is this way: history, alternatives, trade-offs |

The rest of the checklist follows: a single example carried through the page, a sentence on each side of every code block, and headings that name something. Release notes mix explanation with a little how-to.

## Common questions

**What separates it from `writing-for-agents`?**
Who reads the result. An agent has seen everything and needs exact instructions stated once. A person needs to be told what the thing is, then shown it early, and does not mind a little dry humour along the way.

**My repo has its own style rules. Do these override them?**
No. A rule in your `CLAUDE.md` or `AGENTS.md` beats a conflicting one here, and any extra rules you set apply on top. For the same reason the skill takes no side on spelling.

**Why are em-dashes banned?**
Readers have learned to read heavy em-dash use as a sign of generated text, and they trust such pages less. Removing the dash also makes you choose what it was hiding: is the second half an aside, a list, a result, or its own sentence? An en-dash or a spaced hyphen in its place is the same habit, so the rule asks you to rewrite the sentence.

**Can I see where a rule comes from?**
Yes. The skill keeps a separate evidence file with the same numbering, naming the guide or page behind each rule. The agent opens it only when a rule needs checking or citing.

## It's working if

- A page or release note defines its subject in its opening sentence and shows it in use before you scroll.
- Each code block is introduced by a sentence that ends in a colon and followed by one that says what happened.
- Headings name features, often with the API name in code, and none of them asks a question or sells.
- "Simply", "just" and "easily" are gone, the condition precedes each instruction, and the page has no em-dash.
