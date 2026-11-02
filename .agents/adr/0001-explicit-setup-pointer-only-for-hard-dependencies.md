# Point to `/setup-spp` only where a skill cannot work without it

`/setup-spp` writes the per-repo configuration spp reads: the **Routing block**, the triage labels, and the domain docs layout. Some skills are wrong without that configuration, because they publish to a tracker or apply exact label strings. Others only use it to sharpen their output, and still work without it.

We split them in two:

- **Hard dependency** (`to-spec`, `to-tickets`, `triage`, `build`): the skill says, in one line, that the configuration should already exist and that the user should run `/setup-spp` if it does not. Without it, the output is wrong rather than vague.
- **Soft dependency** (`tdd`, `diagnosing-bugs`, `improve-architecture`, and the rest): the skill mentions "the project's glossary" and "the ADRs in the area you touch" in plain prose. When those files are missing the skill still runs, only less sharply.

The pointer costs tokens in every skill that carries it, so it goes only where the configuration carries weight.
