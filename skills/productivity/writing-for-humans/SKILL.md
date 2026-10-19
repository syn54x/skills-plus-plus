---
name: writing-for-humans
description: Writing prose for humans. Use before drafting release notes, a PR body, a docs page or docstring, or an issue or summary comment.
---

Editorial rules for prose a person reads: release notes, PR bodies, docs pages, docstrings, issue and summary comments. Apply them while drafting, then check the draft against the list. Every rule carries its reason so you can judge an edge case; its sources and quotes live in [`EVIDENCE.md`](EVIDENCE.md), numbered to match, for when you need to check or cite one.

A repo's own writing rules in its `AGENTS.md` or `CLAUDE.md` take precedence where they conflict with these, and add to them where they go further.

## Before you write

- [ ] Which of the four kinds is this page: tutorial, how-to, reference, or explanation?
- [ ] What is the one running example?
- [ ] Does every code block have its lead-in sentence and its result sentence?
- [ ] Does every heading name a thing?

## Shape of a page

1. **Decide which of four kinds a page is, and write only that kind.** A tutorial is a lesson where the reader builds something; a how-to is a recipe for a goal the reader already has; reference is austere facts that mirror the product; explanation is the why, history and trade-offs. Mixing kinds buries the facts a reader came for, so link to reference rather than repeat it.
2. **Open with one sentence that says what the thing is, then an example within the first screen.** The reader decides on the first screen whether this page answers them; preamble and history spend that screen on nothing. A tutorial may open with a scenario instead.
3. **One running example per page, introduced once, reused throughout; each new section shows only what changed.** A reader who already holds the example sees the new idea as the only difference.
4. **Order sections from the common case to the specialised one, and end each topic with a pointer to the reference.** Most readers stop once their case is covered, and the pointer hands the rest to the complete list.
5. **Headings are short noun phrases in sentence case that name the feature, often with the API name in code.** A heading is what the eye scans and what a link quotes; a question, an instruction or a slogan names nothing to find.
6. **Map the navigation to the product.** A reader who knows the product's structure then finds the page without searching.

## Examples

7. **Lead-in sentence ending in a colon, the code block, then one sentence on the result. Every time.** The lead-in says what the reader is about to do or see; the follow-up says what changed, never restates the code, so the reader knows what to look at.
8. **Show the output next to the input, as the reader would see it.** Printed output, a REPL transcript or the response body is checkable; prose about output is a claim.
9. **Examples are tested: complete, self-contained, runnable.** A reader copies the block as it stands, and an untested example rots silently.
10. **Small, meaningful data that makes the result easy to verify by eye.** Around four rows of real-looking values, results checkable by mental arithmetic, a fixed seed if randomness is unavoidable; random matrices and columns named A, B, C hide whether the call did the right thing.
11. **Keyword arguments in examples, and one idea per block.** A keyword names what each value does; stacked calls with no sentence between them leave the reader to work out which line taught what.
12. **Where the same thing has two spellings, show both in tabs; explain a line with a numbered callout below the block.** Tabs let each reader pick their case at a glance, and callouts keep the code clean.
13. **Show the equivalent in the thing the reader already knows.** The generated SQL beside the query, the CSS beside the class: a familiar form makes the new one concrete.

## Sentences and words

14. **Second person, active voice, present tense.** "You" for the reader, imperatives for instructions, "we" only for the project's voice in a recommendation or for shared effort in a tutorial; the reader always knows who acts.
15. **Medium sentences, one idea each, with the condition first.** The reader checks the condition before acting, so "If you want x, do y"; a short flat declarative closes a point.
16. **Hedge only where behaviour is conditional, and name the condition.** "By default" and "if the names correspond" mark real conditions; a hedge without one is filler that weakens every true statement beside it.
17. **Never minimise difficulty: drop easily, simply, just, merely, straightforward.** A reader who finds it hard after being told it is easy feels stupid and stops trusting the page.
18. **State the reason beside the rule.** A reader who knows why can handle the case the rule did not foresee.
19. **Dry wit is allowed, in moderation, and never in a reference entry's first sentence. The joke never carries information the reader needs.** A reader who skims past the joke still gets everything.
20. **Admonitions sparingly, each kind for one job:** Note for background or a surprising behaviour, Warning for data loss or a performance hazard, Tip for a pointer elsewhere, a titled box for a sidebar; version markers sit as self-contained blocks at the bottom of a section. Boxes lose their pull when every section has one, and a self-contained version marker can be deleted without reflowing text.
21. **Reference entries follow one template, with stock phrasings:** signature, one or two paragraphs, example, admonitions, version notes; the description opens with a third-person present verb ("Returns") or an infinitive ("Cast"), one line ending with a period, with defaults and exceptions inline next to the parameter. Pick one verb form per project and never mix them, because a reader scanning a reference reads the pattern before the words.
22. **Mechanics everyone agrees on:** code font for every identifier, file name, flag and value; bold for UI elements and a key term on first use, never a sentence; italics for a term of art; links on the API name itself, pointing at the reference; "an HTTP", "an SQL"; serial commas; "they" for a hypothetical person; semantic cross-reference markup over plain backticks. Consistent marking tells the reader what kind of thing a word is, and semantic links cannot rot.
23. **When a heading or title carries an emoji, the emoji comes first.** This holds for every heading and title anywhere: a docs page, a README section, a release headline, a PR or issue title, a comment heading (`## 🧹 Squash an epic's migrations`). Whether to use an emoji at all is the project's call; the position is not. A leading emoji is a marker the eye uses to find the section; a trailing one is decoration at an unpredictable column, and generated anchors and link text stay word-first.
24. **Titles and link text say exactly what the page gives.** "How to integrate application performance monitoring", never a title that could mean "whether" or "what"; descriptive link text, so a reader knows where a link goes before following it.
