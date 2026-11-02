# review on Claude Code

Read only when running on Claude Code. Each capability `SKILL.md` names, and the tool or command that provides it here.

| Capability | On Claude Code |
| --- | --- |
| Start a fresh read-only reviewer | The Agent tool with `subagent_type: "spp:reviewer"` and the prompt `Review pull request <PR or URL>.` The agent preloads this skill and has no edit tools. Without the spp plugin's agents, a general-purpose agent told to follow this skill and edit nothing. |
| Call another skill | The Skill tool. A plugin skill may be listed under its plugin's prefix: the Friend shows as `ponytail:ponytail-review`. |
| Is the Friend available? | `ponytail-review`, with or without the `ponytail:` prefix, is in the session's list of available skills. |
| Throwaway worktree | `git worktree add --detach <scratch dir> "$HEAD"`; remove it with `git worktree remove --force` when the review is posted. |
| Run Verify | Bash, `cd <scratch dir> && spp verify N` (the plugin puts `spp` on the Bash tool's PATH). The fresh worktree is clean, as `spp verify` requires; the `refs/notes/sdd-verify` note it writes stays local. |

A subagent cannot start another subagent, so the reviewer runs `ponytail-review` through the Skill tool in its own context, after its draft is saved, as `PONYTAIL.md` orders.
