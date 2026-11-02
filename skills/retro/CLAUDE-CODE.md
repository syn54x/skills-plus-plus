# retro on Claude Code

- **Session transcripts** live under `<config>/projects/<project>/`, one `<session id>.jsonl` file per session. `<config>` is `$CLAUDE_CONFIG_DIR` when it is set, otherwise `~/.claude`. `<project>` is the working directory's absolute path with every character outside letters, digits and `-` replaced by `-`. The newest file by modification time, other than this session's, is usually the one before it.
- **Subagent transcripts** sit in `<project>/<session id>/subagents/`; read them when the loss happened inside a worker.
- **The person's global instructions** are in `<config>/CLAUDE.md`.
- Each line of a transcript is one JSON event. Filter it with `jq` for the tool calls and their results rather than reading it whole, since a long session runs to many megabytes.
