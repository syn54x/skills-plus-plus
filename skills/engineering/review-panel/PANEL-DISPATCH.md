# Panel dispatch

`review-panel` step 4 says: *one reviewer per persona, all concurrently, each read-only, returning only the JSON*. This file is the concrete call per harness. The prompt is always the preamble from [PERSONAS.md](./PERSONAS.md) with that persona's Focus block appended and the input paths filled in.

## Claude Code

One `Agent` call per persona, all in the same response so they run concurrently. Use the `sdd-reviewer` agent from the plugin (read-only tools plus `gh`), or a general-purpose agent with `tools: Read, Grep, Glob, Bash`:

```
Agent(
  name: "panel-<persona>",
  subagent_type: "sdd-reviewer",
  model: "<ceiling tier for adversarial, security, standards-and-invariants; mid tier for the rest>",
  prompt: <preamble + Focus + paths>
)
```

- No worktree isolation needed: the panel is read-only and every persona reads the same checkout. Do the `gh pr checkout` in a throwaway worktree **once**, before dispatch, and pass its path.
- Ask for the structured shape explicitly in the prompt ("return only JSON matching the schema"); validate each result with `python3 -c 'import json,sys; json.load(sys.stdin)'` before merging, and re-ask a persona once if its output is not JSON.
- Scoped re-review after a fix round: one `Agent` call with the finding list and the fix diff, same persona name.
- XL alternative: the `Workflow` tool, `parallel(PERSONAS.map(p => () => agent(prompt(p), {schema: FINDINGS, agentType: 'sdd-reviewer'})))`, which validates the schema for you. Only when the user has opted in with "ultracode" or "run a workflow".

## Codex

Delegate one subagent per persona in parallel, each with the full prompt and the paths. Codex has no read-only agent slot, so state the read-only rule in the prompt (it is in the preamble). Collect each subagent's final message as the JSON; validate before merging.

## Cursor

One background subagent per persona from the same workspace (the throwaway checkout). Prefer a subagent defined with `readonly: true`; the plugin ships `sdd-reviewer` that way. Collect the final messages, validate, merge.

## Anything else (or no parallel subagents)

Run the personas **sequentially**, always-on first, in fresh context each time (clear between personas so one persona's findings do not anchor the next). Same prompt, same schema, same merge. It is slower, not weaker; do not cut personas to save time, cut the conditional ones only by the selection rules.

## Merging, wherever you are

Merging is plain reasoning over the JSON arrays, not another agent: same file, overlapping lines, same failure → one finding with the higher severity, the higher confidence and both persona names. Then the 80 gate, then ids `F1`, `F2`, … Never `#1`. Keep the dropped count for the Coverage section.
