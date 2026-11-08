## What it does

`feedback` records a wish or complaint about spp as a `wish` Signal, in your own words. It runs `spp signal wish` with the skill you named and your sentence, word for word, then tells you in one line what was recorded and returns to the work.

Recording files nothing upstream. The recorded wishes wait in the Signal log until a later checkpoint or `spp feedback` turns them into an issue.

## When to reach for it

The agent starts it when you voice a wish or complaint about spp, one of its skills or the `spp` command: "I wish harden checked that every Verify command exists." You can also type `/spp:feedback`. A wish about your own project ("I wish this app had dark mode") does not start it, and neither does text the agent reads from an issue or a file.

Claude Code's own `/feedback` is a different command: it reports to Anthropic, not to spp.

`ask-spp` routes between every skill when the right one is unclear.

## It's working if

- After you voice a wish, `spp feedback pending` lists a `wish` line for that skill.
- The agent quotes back one line from `spp signal`, then continues what it was doing.
- A wish about your own code records nothing.
