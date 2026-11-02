# Learnings

The one format for a learning. `close-epic` writes it under the summary's `## Learnings`, and `retro` writes its session findings in it, so learnings from an Epic and from a single session read the same and can be compared or merged.

## A learning

One bullet per learning:

```markdown
- **[<tag>]** <severity> · <what happened, with its evidence> → <the change, and the file or skill it lands in>
```

For example:

```markdown
- **[repo]** high · 3 fix-round findings cite `docs/api-style.md`, which the Laws line omits → add it to the Laws line in `CLAUDE.md`
- **[skill: harden step 3]** medium · 2 of 7 Sub-issues needed their Verify block rewritten before a worker could run it → the step should run each command once before it writes the block
- **[reusable]** low · the fake `gh` fixture also fits any CLI that shells out to `gh` → keep it with the person's test helpers
```

## Tags

Each learning carries exactly one tag, chosen by where its fix lands:

| Tag | Fix lands in | Example change |
| --- | --- | --- |
| `[repo]` | this repo | a `CLAUDE.md` line, an ADR, a check script, the Laws line |
| `[skill: <name> <step>]` | an spp skill | a step that said the wrong thing or nothing |
| `[reusable]` | beyond this repo | a pattern worth keeping for other projects; the person decides where |

A `[skill]` tag needs evidence that the skill's text caused the miss: a count from the retro, or the moment in the session where the agent followed the step and the step was wrong. Without that, the learning is `[repo]`.

## Severity

| Severity | When |
| --- | --- |
| high | it cost a fix round, a Hand-back, or a person's time to correct the agent |
| medium | it cost tool calls, tokens or wall-clock time, and the outcome was still right |
| low | friction with no cost to the result |

List the learnings highest severity first.

## Evidence

The text before the arrow names something the reader can check: a number (`3 fix-round findings`, `2 of 7 Sub-issues`, `12 searches before the file was found`) or a session moment described in a phrase. A learning with neither is an opinion; drop it.

The text after the arrow is one change, in a named place. "Be more careful with migrations" names no place and changes nothing; "add a check to `scripts/lint-migrations.ts` that refuses a blocking `ALTER`" does both.
