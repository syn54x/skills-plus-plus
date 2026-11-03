---
name: writing-for-humans
description: Prose rules for anything a person reads. Use before drafting a pull request body, release notes, a docs page, a docstring or an issue comment.
---

How to write text that people, not agents, will read: docs pages, docstrings, release notes, pull request bodies, and comments on issues and Epics. Draft with these rules in view, then go through the finished draft one rule at a time before it is posted or committed. Every rule gives its reason, which is what lets you apply it to a case it never names. [`EVIDENCE.md`](EVIDENCE.md) lists the source behind each rule under the same number; open it only to check or cite a rule.

A writing rule in the repo's own `CLAUDE.md` or `AGENTS.md` beats a conflicting rule here, and the repo's extra rules apply on top of these.

## Before you write

- [ ] Which kind of page is this: tutorial, how-to, reference or explanation?
- [ ] Which single example will the page carry from start to end?
- [ ] Is every code block introduced by a sentence and followed by one?
- [ ] Does every heading name something a reader would look for?

## Shape of a page

1. **Choose one of the four kinds and stay in it.** A tutorial teaches by having the reader build something. A how-to gives the steps to a goal the reader brought with them. Reference states facts, organised the way the product is. Explanation covers why: history, alternatives, trade-offs. Mixing kinds buries the fact the reader wanted, so point to the reference page rather than repeating it.
2. **The first sentence defines the subject, and an example appears before the reader scrolls.** The first screen is where readers decide whether to stay, and background spends it without helping them decide. A tutorial may start from a scenario instead.
3. **Carry one example through the whole page.** Introduce it once; each later section shows only what is new, so the new idea is the only unfamiliar thing on the screen.
4. **Cover the common case first and the rare ones after it, and end each topic by linking the complete reference.** Most readers leave once their own case is answered, and the link serves everyone else.
5. **Name each section with a short noun phrase in sentence case, often including the API name in code.** Readers scan headings and links repeat them; a question, an order or a tagline gives the eye nothing to land on.
6. **Organise the navigation like the product.** Readers who know how the product is built can then guess where a page lives.

## Examples

7. **Introduce every block with a sentence that ends in a colon, and follow it with one sentence on what happened.** The first sentence says what is coming; the second points at what changed rather than repeating the code, so the reader knows where to look.
8. **Put the output next to the code that produced it, exactly as the reader will see it.** Real output (printed values, a REPL session, a response body) can be checked, while a description of output has to be taken on trust.
9. **Every example runs as written: complete, self-contained and tested.** Readers paste blocks whole, and an example nobody runs breaks quietly.
10. **Keep sample data small and plausible, so the result can be checked at a glance.** Roughly four rows of realistic values, answers you can confirm in your head, and a fixed seed if anything is random. A grid of random numbers under columns A, B and C makes it impossible to see whether the result is right.
11. **Pass arguments by keyword, and teach one thing per block.** The keyword says what each value is for. A run of calls with no prose between them leaves the reader to work out which line taught what.
12. **Put alternative spellings of the same thing in tabs, and explain individual lines with numbered notes under the block.** Readers choose their own case from the tabs, and the code stays uncluttered.
13. **Show the form the reader already understands.** Printing the SQL behind a query, or the CSS behind a utility class, anchors the unfamiliar form in a familiar one.

## Sentences and words

14. **Address the reader as "you", in the active voice and the present tense.** Instructions are imperatives. Keep "we" for the project making a recommendation or for working through a tutorial together, so it is always clear who does what.
15. **One idea per sentence, sentences of middling length, and the condition before the instruction.** The reader needs the condition before acting, so write "If you want x, do y". A short, plain sentence is a good way to end a point.
16. **Qualify a statement only when the behaviour really depends on something, and say what.** "By default" and "when the names match" are honest qualifiers. A hedge with nothing behind it is padding, and it makes the true sentences around it sound unsure.
17. **Never tell the reader something is easy.** Cut *easily*, *simply*, *just*, *merely* and *straightforward*. Someone who struggles after reading that it was simple feels foolish and starts doubting the rest of the page.
18. **No em-dashes.** When a sentence reaches for one, work out how its two halves relate and write that: a comma, a colon, a full stop, parentheses or a conjunction. An en-dash or a spaced hyphen in its place is the same dash. Readers now read a page full of em-dashes as machine-written and trust it less, and the dash lets a writer attach a second thought without saying what it has to do with the first.
19. **Give the reason alongside the rule.** Knowing the reason lets a reader apply the rule to a case it never mentions.
20. **A little dry humour is fine, but never in the opening sentence of a reference entry, and never carrying something the reader needs.** Someone who skips the joke must lose nothing.
21. **Use admonition boxes rarely, and give each type one purpose.** Notes hold background or surprising behaviour, warnings flag data loss or slow paths, tips send the reader somewhere else, and a titled box holds a sidebar. Version notes go in their own block at the end of a section, so removing one later leaves the surrounding text intact. When every section has a box, none of them stands out.

## Marking and titles

22. **Reference entries share one layout.** Each has the same parts in the same order: signature, a paragraph or two, an example, any admonitions, then version notes. The summary line opens with a third-person verb ("Returns") or an infinitive ("Cast") and ends in a full stop, and each default or exception is stated next to its parameter. Choose one verb form per project and keep to it, because readers scanning reference take in the shape before the wording.
23. **Mark each kind of word one way, everywhere.** Code font for identifiers, file names, flags and values; bold for interface labels and for a key term where it is defined, never for a whole sentence; italics for a term of art; links placed on the API name and pointing at its reference; "an HTTP", "an SQL"; the serial comma; "they" for an unnamed person; the tooling's cross-reference syntax over plain backticks where it has one. Readers learn what a word is from how it is marked, and cross-reference syntax keeps links from breaking.
24. **If a heading or title has an emoji, the emoji goes at the start.** That applies to docs headings, README sections, release headlines, pull request and issue titles and comment headings alike (`## 🧹 Squash an Epic's migrations`). The project decides whether to use emoji at all; it does not get to move them. At the start, the emoji sits in the same column every time and the eye finds it, while anchors and link text still begin with words.
25. **A title or a link's text promises exactly what the target delivers.** "How to add request tracing" cannot be misread as asking whether or what. A link's text names where it leads, so the reader knows before clicking.
