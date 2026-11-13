# chief-of-staff on Claude Code

Read only when running on Claude Code. Each capability the skill names, and the tool behind it here. These tools are often deferred: load them with ToolSearch before the first call.

## Capabilities

| Capability | On Claude Code |
| --- | --- |
| Start a separate session | The `start_session` tool (`mcp__ccd_session__start_session`), offered in the desktop app; a terminal session does not have it. Set `initiation` to `"user_asked"` when the person told you to build or triage this issue, otherwise `"own_initiative"`; `context: "fresh"`; `cwd` the issue's checkout as an absolute path; `use_worktree: false`; `wake_when_done: true`, so its turn-end note wakes you; no `model`; `title` naming the skill and the issue; `name` such as `build-<N>` or `triage-<N>`; `prompt` as the skill gives it; `background` of at least 80 characters saying that the Chief of Staff session for the person's goal started this session for this issue, and whether they asked for it or you decided on it. |
| Send a message to a session | `SendMessage` with `to` set to the session's `local_...` id from `list_sessions` (`mcp__ccd_session_mgmt__list_sessions`, `linked: true`). Where only the older tool is offered, `send_message` (`mcp__ccd_session_mgmt__send_message`). |
| Run a background subagent | The Agent tool with `run_in_background: true`. |
| Run on a schedule | `create_scheduled_task` (`mcp__scheduled-tasks__create_scheduled_task`), or the `schedule` skill for a cloud routine. |

## Limits

- `start_session` starts a session only on a turn the person began. On a scheduled wake-up the Chief of Staff proposes the build and waits for them to answer; it starts the session on that turn.
- The parent sees only the first 400 characters of a child's turn-end note, which is why a waiting session opens with `#<N> waits on you: <question>`.
- If a send reports anything but `delivered` or `queued`, tell the person the answer did not reach the session and to answer there instead.
