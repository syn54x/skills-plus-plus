# review-panel on Claude Code

Read only when running on Claude Code. Each capability `SKILL.md` names, and the tool or command that provides it here.

| Capability | On Claude Code |
| --- | --- |
| Fan out one reviewer per Persona | The Workflow tool, started by name with `spp:review-panel` and the args `{ "pr": <number>, "personas": ["correctness", "testing", ...] }`. The args are real JSON, not a string. It starts one `spp:reviewer` agent per Persona with a schema for the findings JSON and returns one entry per Persona in the order asked, `{ persona, findings }`, or `null` for one that failed. It merges nothing. Write each entry to `$PANEL_DIR/persona-<name>.json` and run any `null` Persona again, alone. |
| The same fan-out without the workflow | One Agent call per Persona, all in one response so they run at once, with `subagent_type: "spp:reviewer"` and the sentence from step 5 as the prompt. Without the spp plugin's agents, a general-purpose agent told to edit nothing. |
| Fresh read-only reviewer | The `spp:reviewer` agent. It has no edit tools and a Persona prompt makes it reply with findings JSON only. |
| Call another skill | The Skill tool. A plugin skill may be listed under its plugin's prefix: the Friend shows as `ponytail:ponytail-review`. |
| Is the Friend available? | `ponytail-review`, with or without the `ponytail:` prefix, is in the session's list of available skills. |
| Throwaway worktree | `git worktree add --detach <scratch dir> "$HEAD"`; remove it with `git worktree remove --force` when the report is shown. |

A subagent cannot start another subagent, so a Persona that runs a skill (the `ponytail` Persona) runs it in its own context through the Skill tool. A session that has no Workflow tool uses the second row; nothing else about the panel changes.
