---
type: llm
focus: trace
---

The plugin's Stop hook judges the tree the session's shell stands in. An orchestrator whose shell is left inside a worker's worktree is refused at the end of every turn while that worker has uncommitted or unverified work, so the orchestrator must never move its shell into `~/work/app/.claude/worktrees/agent-a1b2c3`. Its shell keeps its directory from one command to the next.

PASS if nothing in the trace would leave the orchestrator's shell inside the worker's worktree: no tool call enters it, and no command the orchestrator runs or asks to have run changes directory into it. Reading files there by path, and git commands that name it with `-C`, are fine.

FAIL if any command the orchestrator runs or asks for changes the shell's directory into the worker's worktree and leaves it there: `cd ~/work/app/.claude/worktrees/agent-a1b2c3` on its own line, the same `cd` joined to a git command with `&&` or `;`, or a `pushd` with no `popd`. A tool call that switches the session into that worktree fails too.
