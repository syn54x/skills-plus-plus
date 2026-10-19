## What it does

`writing-for-humans` holds the editorial rules for prose a person reads: release notes, PR bodies, docs pages, docstrings, and issue and summary comments. It is a short checklist and 24 rules in three groups (shape of a page, examples, sentences and words), each with the reason it exists.

It is applied while drafting, not after. Left alone, an agent writes accurate prose in the generic habit: a scene-setting lead before the definition, a second example where one would do, headings that read as slogans, code blocks with no sentence saying what to look at. The rules were distilled from the style guides and docs of Django, pandas, Pydantic, FastAPI, Diátaxis, Rust, Google, MkDocs, Tailwind, visx and Zensical, and a draft rewritten against them improves without needing anything the first pass lacked.

## When to reach for it

Type `/writing-for-humans`, or the agent reaches for it automatically when a task fits. Four skills load it at their drafting step:

| Skill | Where it loads |
| --- | --- |
| [prepare-release-notes](../engineering/prepare-release-notes.md) | Before drafting the highlights |
| [pr](../engineering/pr.md) | Before writing the body's prose |
| [implement-issue](../engineering/implement-issue.md) | When the ticket touches a docs page or docstring |
| [close-epic](../engineering/close-epic.md) | Before the epic's summary comment |

Reach for it by hand for any other prose a person reads. For a document an agent reads (a skill, an `AGENTS.md`, a spec), use [writing-for-agents](writing-for-agents.md) instead.

## The four kinds

The first item on the checklist is the leading idea: every page is one of four **kinds**, and you write only that kind.

- **Tutorial**: a lesson; the reader builds something.
- **How-to**: a recipe for a goal the reader already has.
- **Reference**: austere facts that mirror the product's structure.
- **Explanation**: the why, the history, the trade-offs.

The other three checklist items follow from it: one **running example** per page, a lead-in and a result sentence around every code block, and a heading that names a thing. Release notes are explanation plus how-to.

## Common questions

**How is this different from `writing-for-agents`?**
The reader differs, so the rules differ. An agent has read everything and wants imperatives, no examples-first and no wit. A person wants a definition, then an example on the first screen, and tolerates a little dry humour.

**My project has its own writing rules. Which wins?**
Yours. Rules in a repo's `AGENTS.md` or `CLAUDE.md` take precedence where they conflict and add to these where they go further. That is why the skill picks no spelling convention: British or American spelling is the project's call.

**Where are the sources?**
Each rule carries its reason in `SKILL.md`. The quotes and the pages they came from sit in a sibling `EVIDENCE.md`, numbered to match, which the agent reads only when it needs to check or cite a rule.

## It's working if

- The first sentence of a page or release note says what the thing is, and an example follows within the first screen.
- Every code block has a sentence before it ending in a colon and a sentence after it saying what changed.
- Headings name features (often with the API name in code) rather than ask questions or sell.
- Words like "simply" and "just" are gone, and conditions come before the instruction they govern.

## Where it fits

A model-invoked reference underneath the drafting steps of other skills, and a reach-for-it-anytime standalone when you write prose by hand. Its sibling [writing-for-agents](writing-for-agents.md) covers the documents an agent reads. When you're unsure which skill or flow fits a task, [ask-syn54x](../engineering/ask-syn54x.md) routes you over the whole set.
