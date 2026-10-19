# New skill proposals and contributions

This repo does not take proposals or contributions for new skills, including ones that arrive with a ready branch or a fork.

## Why this is out of scope

The catalog is the set of skills I use myself every day, and it's deliberately small. Every skill is permanent maintenance surface: it has to stay in step with the others, with the docs pages, with `ask-syn54x`'s routing map, and with the plugin manifest. The shorter and fewer the skills, the cheaper they are to keep correct.

The rule I apply to my own ideas applies here too: if you can compose the behaviour from existing skills, it doesn't get a new skill. Most proposals are a specific workflow built out of grilling, `to-spec`, `to-tickets`, `implement` and friends, and that composition belongs in your own prompts or your own skills.

You're very welcome to publish a skill yourself. skills.sh makes that straightforward, and nothing here needs to know about it.

## Exceptions

An exception is made only when the behaviour cannot be composed from existing skills: a body of rules several skills need, that none of them can own without the others restating a fragment of it.

- `writing-for-humans` (#31): the editorial rules for prose a skill writes for a human reader (release notes, PR bodies, docs pages, summary comments). `prepare-release-notes`, `pr`, `implement-issue` and `close-epic` each needed them, and each either said nothing or carried its own fragment. `humanizer` removes AI tells after drafting and `writing-for-agents` writes for a different reader, so neither can hold them.

This covers *new* skills only. A concrete failure in an existing skill is judged against the bar in [`SCOPE.md`](../SCOPE.md) like any other issue.

## Prior requests

- #101: "Any skill to iteratively build CONTEXT.md (and ADRs) for a brownfield codebase?"
- #414: "Add a `handoff-to-pro` skill for generating one-shot prompts for external frontier chat models"
- #727: "new skill - teach pr"
- #1051: "Contribution ready: /red-team, the optional pre-implementation spec review from #633"
- #1166: "Skill proposal: agent-chat-ux for productivity (branch ready on fork)"
