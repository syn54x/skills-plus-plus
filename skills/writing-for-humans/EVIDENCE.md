# Evidence

The source behind each rule in [`SKILL.md`](SKILL.md), under the same number. Most rules come from published style guides (Django, pandas, Google's developer documentation guide, Rust RFC 1574, Pydantic's contributor notes, Diátaxis) or from habits shared by well-regarded docs sites (FastAPI, Pydantic, pandas, Django, MkDocs, Tailwind, visx, Zensical). A rule with no outside source says so. Quotes are kept to a few words; follow the named source for the full text.

## Shape of a page

1. **One kind per page.** Diátaxis defines the four kinds. Django's style guide keeps general explanation out of reference pages and prefers a link to reference over a repeat of it.
2. **Define, then show.** Tailwind's page on variants defines the term in its first sentence and shows `hover:bg-sky-700` in its second. FastAPI's request body tutorial opens on a scenario, the tutorial exception.
3. **A single example.** Django's guide to making queries sets up its blog models at the top and works with them until the end.
4. **Common first, then the reference link.** pandas walks its merging guide from `concat` to `merge`, then `merge_asof`, then `compare`. Tailwind closes its sections by sending the reader to the full reference.
5. **Noun-phrase section names.** Sentence case is an explicit rule at both Django and Google. Django's "Retrieving a single object with `get()`" puts the API name in the heading.
6. **Navigation shaped like the product.** Diátaxis asks that reference follow the product's own structure. Zensical gives each Markdown construct its own authoring page.

## Examples

7. **A sentence each side of the block.** Every surveyed page from MkDocs, FastAPI, Django and pandas uses this rhythm.
8. **Output beside code.** Pydantic shows results as comments inside the block, pandas and Django use REPL sessions, and FastAPI prints the JSON reply.
9. **Runnable examples.** FastAPI says its code blocks are tested files. Pydantic requires examples to run as written. pandas refuses a merge when a doctest fails.
10. **Small, plausible data.** pandas asks for around four rows of meaningful values instead of random numbers under lettered columns, plus a fixed seed where randomness is needed. Pydantic prints results instead of asserting them, so the reader sees them.
11. **Keywords, and one lesson per block.** pandas favours `head(n=3)` over `head(3)` and names consecutive calls with no prose between them as a frequent error.
12. **Tabs and line notes.** Pydantic tabs its two styles of validator, and Zensical tabs install steps by platform. Numbered notes under a block have no single source.
13. **The form the reader knows.** Django prints the approximate SQL behind a queryset, Tailwind shows the CSS a class produces, and FastAPI likens a dependency to a path function with the decorator removed.

## Sentences and words

14. **"You", active, present.** Google and Django both require it.
15. **Condition before instruction.** Google's guide says so directly, and Diátaxis frames the how-to as "if you want x, do y".
16. **Qualifiers with a reason.** Observed across the surveyed pages ("by default", "if the names correspond"); there is no single source to quote.
17. **Nothing is easy.** Django's guide forbids *easily*, *simply*, *just*, *merely* and *straightforward*, noting that readers' experience may differ from the writer's.
18. **No em-dashes.** A law in this repository's `CLAUDE.md`. Wikipedia's "Signs of AI writing" counts heavy em-dash use among the marks readers associate with generated text, and rewriting each one makes the writer say how the two clauses relate.
19. **Reasons next to rules.** FastAPI explains why `uv add` writes a lockfile, and Django explains why three apparent database hits are really one.
20. **Dry humour.** No outside source; a house rule from the 1.x skill's design issue, syn54x/skills-plus-plus#31.
21. **Few admonition boxes.** Django tells writers to use them sparingly.

## Marking and titles

22. **One layout for reference entries.** Django's reference entries open "Returns ...", Rust RFC 1574 settles on "Returns" rather than "Return", and pandas docstrings open with an infinitive ("Cast ...").
23. **Consistent marking.** Shared by every guide surveyed; no one source to quote.
24. **Emoji at the start.** No outside source; a house rule from syn54x/skills-plus-plus#31, with its reason stated in the rule.
25. **Titles that promise exactly.** Diátaxis titles how-tos "How to ...", and Google asks for link text that names the destination.
