# Output formats

What the run hands the person. Name code with the project's own words and the domain with the repo glossary's nouns.

## The report

Markdown in the conversation, in this order:

1. A first line `### Test audit of <scope>`.
2. A line `<N> test files read, <K> Pruning opportunities.`
3. A table with the columns `#`, `Remove`, `Keeper`, `Owning code` and `Strength`, ordered `Strong` first, then `Worth exploring`, then `Speculative`.
4. Under the table, one short paragraph per opportunity: which Necessity check question the test fails, the break it names, and why the Keeper catches that break.
5. A last line `Read with nothing to prune:` listing the test files where no opportunity was found.

Say in the report that every Keeper was named by reading and no break was run.

## The issue

The body of a filed Pruning opportunity, exactly this template. Paths are relative to the repo root, and a test name is written as the project's test runner prints it. The heading and the five field labels do not vary, because triage reads them.

```markdown
## Pruning opportunity

- Remove: `<test file>::<test name>`
- Keeper: `<test file>::<test name>`
- Owning code: `<source file>::<function, method or class>`
- Break: <one sentence: the change to the owning code that the removed test catches and the Keeper must also catch>
- Strength: `Strong`, `Worth exploring` or `Speculative`

The Keeper was named by reading. No break was run.

## Why it is redundant

<Two or three sentences: the Necessity check question the test fails, and why the Keeper already owns the behaviour.>
```
