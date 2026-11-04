# Credits

`build` combines three sources.

- Matt Pocock's [`implement-spec`](https://github.com/mattpocock/skills/tree/main/skills/engineering/implement-spec): one integration branch per spec, tickets read as a graph of blocking edges with a ready frontier, and a fresh worker in its own worktree for each ticket, started as soon as the frontier lets it.
- Jesse Vincent's Superpowers [`subagent-driven-development`](https://github.com/obra/superpowers/tree/main/skills/subagent-driven-development): a fresh reviewer gating each worker's result with a spec check and a quality check, and the worker statuses (DONE, DONE_WITH_CONCERNS, BLOCKED, NEEDS_CONTEXT) the orchestrator routes on.
- OpenSpec's [`openspec-sync-specs`](https://github.com/Fission-AI/OpenSpec/tree/main/skills/openspec-sync-specs): recording a change to the spec made mid-build as an ADDED, MODIFIED or REMOVED delta against it.

spp took the ideas, not the text: the wording is spp's own.
