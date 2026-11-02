## What it does

`review-panel` reviews the pull request that takes a big Epic to the base branch. It first gets the Epic's spec and coherence verdicts from [review](review.md), then fans out a panel of **Personas**: reviewers that each read the same diff with one fixed focus, such as correctness, testing, security or history. It ends in one report with one verdict: MERGE, FIX FIRST or HUMAN DECISION.

The Personas only find things. They never rank, merge or judge. `spp findings merge` combines their findings and, given the round and the Spec, Coherence, Verify and checks readings, prints the verdict from a fixed rule, so the same findings and readings always give the same list and the same verdict. The panel edits no code and never merges; you do.

## When to reach for it

You type `/review-panel <pull request>`; the agent never starts it on its own. On the Epic path, `build` runs it for you when `spp next` says the Epic is big enough: four or more Sub-issues, any size L Sub-issue, or 1,000 or more changed lines. The Routing block's `Panel` line changes those thresholds, and `no-size-L` on it turns the size L trigger off. When you type the command yourself, none of them is checked, because you already decided.

| Your situation | Use |
| --- | --- |
| A slice pull request into an integration branch | [review](review.md) |
| An Epic's pull request to main, below the thresholds | [review](review.md), whose spec verdict is the whole main gate |
| An Epic's pull request to main, above them, or any pull request to main you want read from many angles | `review-panel` |

A panel on a slice costs up to nine reviews for one slice, so the skill refuses a pull request whose base is not the default branch. `ask-spp` routes between every skill when the right one is unclear.

## The Personas

Six always run: `correctness`, `testing`, `maintainability`, `standards-and-invariants`, `history` and `depth`. The panel adds the ones the diff touches:

| Persona | Added when the diff touches |
| --- | --- |
| `security` | authentication, permissions, user input, secrets |
| `reliability` | retries, timeouts, background jobs, external calls |
| `adversarial` | a lot of executable code, or payments, data mutation, external APIs |
| `data-migration` | schema, backfills, data transforms |
| `api-contract` | routes, shared types, payloads other Sub-issues or repos use |
| `ponytail` | nothing in particular: added whenever the ponytail plugin is installed |

At most nine run. Ponytail is a **Friend**, so its findings face the same merge as everyone else's and its own verdict is never read.

## Prerequisites

The repo needs the Routing block that `/setup-spp` writes, since the Laws line tells the `standards-and-invariants` Persona which documents to hold the diff against. On Claude Code the fan-out is a plugin workflow, `spp:review-panel`, that only starts one reviewer per Persona and returns what each found. On a harness without workflows the skill starts the reviewers itself.

## Common questions

**Why did CI being red make the verdict FIX FIRST when no Persona found anything?**
A failing check on the head is evidence the panel cannot read around. The verdict rule counts it with Spec FAIL, a red Verify block and any Critical finding. A check that has not finished yet gives HUMAN DECISION instead, and the panel never waits for it.

**What happens after FIX FIRST?**
The Critical and Important findings go back to the Sub-issues that own the files, and `build` starts a fix worker for each. Then the panel looks again: it checks each earlier finding, re-runs the spec and coherence verdicts, and runs the always-on Personas once over the combined fix diff, so defects that only exist where two fixes meet show up. Two fix rounds are allowed.

**Why does one worker get a whole class of findings?**
When the same rule is broken in files owned by several Sub-issues, fixing it piecemeal means several workers re-deciding the same fix. The skill sends the whole class to the worker whose Sub-issue owns most of those files, and removes those files from the other workers' scope for the round.

**What happens after the second fix round?**
The decision is yours. If the third round would still say FIX FIRST, the verdict is written as HUMAN DECISION with every open finding. You can then name findings to fix and run an overtime round, and each round past the cap is one decision you made.

**A report I did not post is not on the pull request. Is it lost?**
No. The skill shows the report and asks before posting. Every round is recorded on the Epic's wave comment either way, marked `unposted` until a comment link exists, so the retro still counts it.

## It's working if

- The report opens with one verdict and one sentence naming the first thing that decided it.
- Each finding has an id such as `F3`, a file and line, the Personas that raised it and, where a rule applies, its Law tag.
- The Coverage section lists the Personas that ran, any dropped for the cap of nine, how many findings fell under 80% confidence, and the Verify and checks readings on the head.
- Running the merge again on the same Persona files and readings prints the same list and the same `Verdict:` line, and the report's verdict is that line.
- The Epic's wave comment lists the round with its verdict.
