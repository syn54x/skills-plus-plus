# delegating on Claude Code

Read only when running on Claude Code. Each capability the skill names, and the tool behind it here. These tools are often deferred: load them with ToolSearch before the first call, and treat a ToolSearch that finds none of them as "cannot start sessions".

## Capabilities

| Capability | On Claude Code |
| --- | --- |
| Start a separate session | The `start_session` tool (`mcp__ccd_session__start_session`), offered in the desktop app. A terminal session does not have it, so step 1 answers "no" there. |
| List the sessions this one started | `list_sessions` (`mcp__ccd_session_mgmt__list_sessions`) with `linked: true`. A row whose `startedBy` is this session's id is one this session started. |
| Read a folder's git remote | `git -C <folder> remote get-url origin`; it fails for a folder that is not a git repository. List the candidates one level down with `ls -d <folder>/*/`. |
| Start the sub-session | `start_session` with `initiation: "user_asked"` (the person's choice of sub-session is the ask), `context: "fresh"`, `cwd` set to the checkout's absolute path, `use_worktree: false`, no `model` (omitted, the session inherits yours), `title` naming the skill and the issue, `name` such as `build-<N>`, `prompt` as the skill gives it, and `background` of at least 80 characters saying the user chose to run `<skill>` for this issue in a sub-session from here. |
| Send the user's words to the sub-session | `SendMessage` with `to` set to the sub-session's `local_...` session id from `list_sessions`. Where only the older tool is offered, `send_message` (`mcp__ccd_session_mgmt__send_message`) with `session_id` set to that id or the session's short `name`. The message arrives there as a user turn labelled as coming from this session. |

## Quirks

- `start_session` starts a session only on a turn the user started. The user's answer to step 2's question is such a turn, so start the sub-session in that same turn, not on a later wake-up.
- Pass `cwd` even when the checkout is this session's own folder; `use_worktree: false` with `cwd` keeps that folder as it is.
- The parent sees only the opening of a child's turn-end note, about the first 400 characters. That is why `building` puts its waiting line first; relay what the user answered to that line and nothing more.
- If a send reports anything but `delivered` or `queued`, tell the user the answer did not reach the sub-session and to answer there instead.
