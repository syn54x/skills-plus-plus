# build on Claude Code

Read only when running on Claude Code. Each capability the skill names, and the tool or command behind it here. Tool names below may be deferred in a session: load them with ToolSearch before the first call.

## Drivers

| Driver | Detect | Start a worker |
| --- | --- | --- |
| Desktop linked sessions | The `start_session` tool (`mcp__ccd_session__start_session`) is available | Run `spp dispatch <N> --driver desktop`; it prints the brief's path. Call `start_session` with `initiation: "user_asked"` (the person's `/build` is the ask), `name: "t-<N>"`, `title`, `use_worktree: true`, `branch_name: "sdd-<N>"`, `wake_when_done: true`, `model` set to the tier (same family or cheaper than yours; a higher one is ignored), `prompt` as below, and `background` of at least 80 characters stating the Epic's goal. |
| Background sessions | `CLAUDE_CODE_MESSAGING_SOCKET` is set (`test -n "$CLAUDE_CODE_MESSAGING_SOCKET"`). On the Epic path, `spp next --json` reads the same variable and reports `bg` in its `dispatch` action; a One-off tests the variable itself. | `spp dispatch <N> --driver bg`. It runs `claude --bg --worktree sdd-<N> --name t-<N>` and records `t-<N>` as the worker. It takes no tier yet, so the worker inherits your model: the tier guardrail cannot be met on this driver. |
| Subagents | Neither of the above | One Agent call per issue, every call in one response so the Wave runs together: `subagent_type: "spp:worker"`, `name: "t-<N>"`, `model` set to the tier, `prompt` as below. The `spp:worker` agent already runs in its own worktree, in the background, with `implement-issue` preloaded. |

The prompt, for every driver: `Your full brief is the file <path>. Read it completely before anything else, then run the implement-issue skill for <issue URL> and follow it.`

A worker's name is `t-<N>` under every driver, the same name `spp brief` tells the worker to write on its Worker line. Wave comments take those names as `--workers`.

## Capabilities

| Capability | On Claude Code |
| --- | --- |
| Wake when work changes | Bash with `run_in_background: true` and `spp wait <epic>`; its exit arrives as a notification |
| Resume a worker, send it findings | SendMessage with `to` set to the worker's name. A name keeps working after the worker finishes; a send resumes it from its transcript. |
| Notified when a background session goes idle | SendMessage with `to: "t-<N>"`, `notify_when_idle: true` and no message; one notice arrives |
| Start the fresh reviewer | Call the Skill tool with "review"; its own `CLAUDE-CODE.md` starts `spp:reviewer` |
| Start the review panel | The Workflow tool with the plugin workflow `spp:review-panel` and the pull request URL, only when the session offers it and the user has opted into workflows. Otherwise ask the user to type `/review-panel <PR>`. |
| Run a command in a throwaway worktree | `git worktree add --detach <scratch dir> <integration branch tip>`, then `git worktree remove --force` when done |

## Quirks

- The worker's starting branch is not guaranteed: workers have started on the default branch with the orchestrator on the integration branch. The brief's first commands cut the right branch from `origin/<base>`, which is the mechanism; do not rely on switching your own checkout.
- `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` must be unset. Worktree Waves and agent teams exclude each other in one session; if the flag is set, stop and tell the user.
- Subagent worktrees land under `.claude/worktrees/`; check it is gitignored before the first Wave.
- Pass no permission mode to a worker; the user's configured permissions apply. A session worker stuck on a permission prompt shows as `blocked` in `claude agents`: tell the user to run `claude attach t-<N>`.
- A long run of wake-ups with no user message can stall the desktop driver. Nothing is lost: ask the user to run `/build <N>` again.
- The plugin's Stop and SubagentStop hooks refuse to let a worker finish on an `sdd/*` branch without a Verify record on `HEAD`, so a worker that stops early is told why instead of leaving.

## Cleanup

Once a pull request has merged (or gone to a person), remove that pull request's worker worktree, never a sibling's:

```bash
git worktree unlock <path>        # harness-made worktrees are locked
git worktree remove <path>        # refuses a dirty tree
git branch -d sdd/<N>-<slug>      # -d refuses an unmerged branch, which is the safety wanted
```

A handed-back pull request keeps its branch: skip the last line. Remove only the worktree of a worker that has ended; `claude agents` shows which are still running.
