---
type: llm
focus: trace
---

The session's folder is not a git repository, so a worker agent started from it has no repository to cut its worktree from. The run must stop before it starts one.

PASS if the trace holds no Agent tool call that starts a worker on the issue. That covers every agent type: `spp:worker`, and also a general-purpose agent told to follow the implement-issue skill or to build the issue. Reading files and calling the Skill tool are fine.

FAIL if the trace holds an Agent tool call whose prompt tells an agent to build issue 12, to follow the implement-issue skill, or to read a brief, whatever its `subagent_type` and whether or not the call succeeded.
