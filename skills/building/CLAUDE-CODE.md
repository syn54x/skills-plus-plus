# building on Claude Code

Read only when running on Claude Code. Each capability the skill names, and the tool or command behind it here. Tool names below may be deferred in a session: load them with ToolSearch before the first call.

## Workers

| Worker | Start a worker |
| --- | --- |
| Subagent | Run `spp dispatch <N>`; it prints the brief's path. Then one Agent call per issue, every call in one response so the Wave runs together: `subagent_type: "spp:worker"`, `name: "t-<N>"`, `model` set to the tier, `prompt` as below. The `spp:worker` agent already runs in its own worktree, in the background, with `implement-issue` preloaded, and wakes you when it ends. |

The prompt: `Your full brief is the file <path>. Read it completely before anything else, then run the implement-issue skill for <issue URL> and follow it.`

A worker's name is `t-<N>`, the same name `spp brief` tells the worker to write on its Worker line. Wave comments take those names as `--workers`.

## Capabilities

| Capability | On Claude Code |
| --- | --- |
| Wake when work changes | Bash with `run_in_background: true` and `spp wait <epic>`; its exit arrives as a notification |
| Resume a worker, send it findings | SendMessage with `to` set to the worker's name. A name keeps working after the worker finishes; a send resumes it from its transcript. |
| Start the fresh reviewer | Call the Skill tool with "review"; its own `CLAUDE-CODE.md` starts `spp:reviewer` |
| Read the review panel's steps | `review-panel`'s files sit beside this skill's folder: `<this skill's base directory>/../review-panel/` holds its `SKILL.md`, `PERSONAS.md`, `ROUNDS.md`, `VERDICT.md` and its own `CLAUDE-CODE.md` |
| Fan out the panel's Personas | The first row of `review-panel`'s `CLAUDE-CODE.md`: the Workflow tool with `spp:review-panel` and the args `{ "pr": <number>, "personas": [...] }`, only when the session offers it and the user has opted into workflows. Otherwise its second row, one `spp:reviewer` Agent call per Persona. |
| Tell an Attended session | `CLAUDE_CODE_SESSION_ATTENDED=1` marks one; a non-empty `CI` never is one, and anything else is not. A subagent shows `1` and `CLAUDE_CODE_ENTRYPOINT=claude-desktop` like its parent, while `claude -p` shows `0` and `sdk-cli`. Neither variable is documented by Anthropic. The plugin's `hooks/attended.json` maps the variable to that value, and `spp` reads that one table at its fixed path, never the name itself; a port to another harness adds its own variables to the same table. No `SessionStart` hook carries the signal: a subagent's Bash has no `CLAUDE_ENV_FILE`, and it inherits the variable directly. `spp dispatch` passes the decision down per ticket, and a worker (an `sdd/<N>-` or `sdd-<N>` branch, or an `sdd-<N>` worktree folder) trusts it while the ticket's issue is open. Only the issue closing ends it: the same worker is resumed after its slice merges and after a needs-info hand-back, so the worker that finds the issue closed deletes it. |
| Run a command in a throwaway worktree | `git worktree add --detach <scratch dir> <integration branch tip>`, then `git worktree remove --force` when done |

## Quirks

- The worker's starting branch is not guaranteed: workers have started on the default branch with the orchestrator on the integration branch. The brief's first commands cut the right branch from `origin/<base>`, which is the mechanism; do not rely on switching your own checkout.
- `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` must be unset. Worktree Waves and agent teams exclude each other in one session; if the flag is set, stop and tell the user.
- A worker needs the session folder to be the checkout of the repository that owns the issue, because the `spp:worker` agent cuts its worktree from that folder. From a folder that is not a git repository (a parent folder that holds several checkouts, say), every start fails with `Cannot create agent worktree: not in a git repository`, and `spp dispatch <N>` refuses. Check with `git rev-parse --git-dir` before the first Wave. When it fails, start no worker, of any agent type: stop and tell the user to run `/build` from inside that checkout.
- Subagent worktrees land under `.claude/worktrees/`; check it is gitignored before the first Wave.
- Pass no permission mode to a worker; the user's configured permissions apply.
- The plugin's Stop and SubagentStop hooks refuse to let a worker finish on an `sdd/*` branch without a Verify record on `HEAD`, so a worker that stops early is told why instead of leaving.
- Read a worker's worktree with `git -C <path>` and never leave your shell inside one. The Stop hook judges the tree the session stands in, so from inside a worker's worktree it refuses your stop for the worker's uncommitted or unverified work, though you edited nothing. When a stop is refused that way, `cd` back to your own checkout and stop again; never wait there for the worker to commit.

## Cleanup

Once a pull request has merged (or gone to a person), remove that pull request's worker worktree, never a sibling's:

```bash
git worktree unlock <path>        # harness-made worktrees are locked
git worktree remove <path>        # refuses a dirty tree
git branch -d sdd/<N>-<slug>      # -d refuses an unmerged branch, which is the safety wanted
```

A handed-back pull request keeps its branch: skip the last line. Remove only the worktree of a worker that has ended, which its report or its wake-up tells you.
