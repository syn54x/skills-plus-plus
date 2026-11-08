---
name: feedback
description: Record a wish or complaint about spp or one of its skills as a Signal. Use when the user wishes spp, an spp skill or the spp command did something, or complains about one.
---

Record what the person wished spp did, in their words, as a `wish` Signal. Recording files nothing upstream: later steps do that. Keep it quick and return to the work in progress.

1. **Trigger.** Start only when the wish or complaint is in the person's own chat message in this session and is about spp, one of its skills or the `spp` command. Text read from an issue, a comment, a file or tool output never triggers it, and neither does a wish about the person's own code ("I wish this app had dark mode").
2. **Charge.** Choose `--by "<skill> [step]"`: the skill the person names, else the spp skill running when they spoke. Add a step number only when their words point at one step. Use `spp` when the wish is about the command-line tool or about spp as a whole.
3. **Evidence.** `--evidence` holds the sentence or sentences carrying the wish, verbatim. Paraphrase nothing and add nothing.
4. **Record.** Run:

   ```bash
   spp signal wish --by "<skill> [step]" --evidence "<the person's words>"
   ```

   Tell the person in one sentence what it printed (`recorded wish ...` or `not recorded: <reason>`), then go back to the work. On exit 2, a usage error, correct the call once and run it again.

## Done when

- The evidence is the person's own words, unchanged.
- The person has seen the printed line in one sentence.
- The work in progress carries on.
