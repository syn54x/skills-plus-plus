# Evidence

The sources behind each rule in [`SKILL.md`](SKILL.md), numbered to match. The rules were distilled from Django's and pandas's contributor style guides, Pydantic's contributing page, Diátaxis, Rust RFC 1574, Google's developer style highlights, and representative tutorial, topic and reference pages from FastAPI, Pydantic, pandas, Django, MkDocs, Tailwind, visx and Zensical. A rule with no external source says so.

## Shape of a page

1. **Four kinds.** Diátaxis names the four kinds. Django: "Reference guides aren't the place for general explanation"; "Link to reference material rather than repeat it."
2. **Definition, then example.** Tailwind: "Every utility class in Tailwind can be applied conditionally by adding a variant…" then "For example, to apply `bg-sky-700` on hover, use `hover:bg-sky-700`:". The tutorial exception, FastAPI: "When you need to send data from a client… you send it as a request body".
3. **One running example.** Django's query guide declares its Blog/Author/Entry models up front and never changes the sample data.
4. **Common case first, pointer last.** pandas orders its merging guide `concat` → `merge` → `merge_asof` → `compare`. Tailwind closes every section with "See the … reference for a complete list."
5. **Noun-phrase headings.** "Data conversion", "Retrieving a single object with `get()`". Django and Google both make sentence case an explicit rule.
6. **Navigation mirrors the product.** Diátaxis: reference structure "should mirror the structure of the product". Zensical's authoring section is one page per Markdown construct.

## Examples

7. **Lead-in, block, result.** MkDocs, FastAPI, Django and pandas follow this cadence without exception.
8. **Output beside input.** Pydantic prints with `#>` comments inside the block; pandas and Django use REPL transcripts; FastAPI shows the JSON response.
9. **Tested examples.** FastAPI: "All the code blocks can be copied and used directly (they are actually tested Python files)." Pydantic: examples "must be complete, self-contained, and runnable." pandas: "A failing doctest will be a blocker for merging a PR."
10. **Small, meaningful data.** pandas: about four rows, "meaningful data, not a matrix of random numbers with columns A, B, C, D", values like `[1, 2, 3]` for `mean`, a fixed seed if randomness is unavoidable. Pydantic prefers `print` to bare `assert` so the output is visible.
11. **Keyword arguments, one idea per block.** pandas prefers `head(n=3)` over `head(3)`, and lists stacked calls without a sentence between them as a common mistake.
12. **Tabs and callouts.** Pydantic tabs annotated versus decorator validators; Zensical tabs macOS/Windows/Linux. The numbered-callout half (`# (1)`) names no single source.
13. **The familiar equivalent.** Django shows the SQL a QuerySet "translates (roughly) into"; Tailwind shows generated CSS beside the HTML; FastAPI relates a dependency to "a path operation function without the decorator."

## Sentences and words

14. **Second person, active, present.** Google and Django both codify this.
15. **Condition first.** Google: "Put conditions before instructions." Diátaxis's how-to form is the conditional imperative: "If you want x, do y."
16. **Named hedges.** Observed across the surveyed pages ("by default", "if the names correspond"); no single quoted source.
17. **No minimisers.** Django bans "easily", "simply", "just", "merely", "straightforward": "People's experience may not match your expectations."
18. **Reason beside the rule.** FastAPI: `uv add` writes a lockfile "so the same package versions can be installed later." Django: "Though this looks like three database hits, in fact it hits the database only once."
19. **Dry wit.** No external source; a house rule from issue #31.
20. **Sparing admonitions.** Django: "Use these boxes sparingly."
21. **Reference template.** Django's reference entries ("Returns a new QuerySet containing…"); Rust RFC 1574: "Returns" not "Return"; pandas docstrings open with an infinitive ("Cast Series type.").
22. **Shared mechanics.** Common to the style guides surveyed; no single quoted source.
23. **Emoji first.** No external source; a house rule from issue #31, with the reasoning given in the rule.
24. **Exact titles.** Diátaxis, for how-tos: "How to integrate application performance monitoring". Google: "Use descriptive link text."
