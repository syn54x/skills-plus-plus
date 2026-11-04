---
name: build
description: Build an Epic or a hardened One-off into pull requests, with workers in parallel worktrees behind a review gate.
disable-model-invocation: true
---

You are the orchestrator for `/build <N>`. Workers write the code, a fresh reviewer gates each pull request, and you route between them. You never edit source and you never merge to the base branch; a person does that.

You hold no state. Every decision comes from `spp kind` or `spp next`, which read GitHub, so a lost session loses nothing and resuming is running `/build <N>` again. When a command's output and your memory disagree, the output wins.

Input: an issue number, or its URL when the Epic spans repos.

## 1. Kind

Run `spp kind <N>`. It prints the kind and the reason.

| Kind | Meaning | Do |
| --- | --- | --- |
| `epic` | N has Sub-issues | The Epic path, [`EPIC.md`](EPIC.md), once steps 2 and 3 are read. |
| `sub-issue` | N carries the Ticket contract and has a parent Epic | Stop. Print the reason and ask the user to run `/build <epic>` on that parent. A Sub-issue is built through its Epic, never the One-off path. |
| `one-off` | N carries the Ticket contract and has no Epic: a hardened One-off | The One-off path, [`ONE-OFF.md`](ONE-OFF.md), once steps 2 and 3 are read. |
| `raw` | N lacks the contract | Stop. Print the reason and ask the user to run `/triage <N>`. A raw issue never reaches a worker. |

Done when you hold the kind and, for `sub-issue` or `raw`, the user has the reason.

## 2. Pick the driver

A **Driver** is the mechanism a worker runs in. Every driver keeps one contract: an issue number goes in, a pull request comes out, all state lives in GitHub. Choose once per run, by capability, best first, and test each by the presence of its tool or signal:

1. **Desktop linked sessions**, when a tool that starts a separate linked session is available. Sessions show as sidebar rows, the person can steer them, and the app wakes you when one ends.
2. **Background sessions**, when the cross-session messaging socket is present. On the Epic path `spp next <epic> --json` reports it as the `driver` of its `dispatch` action (`bg` or `subagent`). A One-off has no `spp next`, so test for the socket yourself, as `CLAUDE-CODE.md` says. `spp dispatch <N> --driver bg` starts the worker, and `spp wait <epic>` run in the background wakes you.
3. **Isolated subagents** otherwise: one worker agent per issue, each in a worktree of its own.

Never take a lower driver while a higher one is available, and never take a higher one on a guess. The one exception is the user's own choice: a Driver the user chose at the first Wave's approval (`EPIC.md`) stands for the run, even when a higher one is available. The desktop app starts linked sessions only on a turn the user started, so desktop Waves after the first wait for a user message; that is why the user is asked. On Claude Code, [`CLAUDE-CODE.md`](CLAUDE-CODE.md) names the tool or command behind each capability here; read it now.

| Capability | How |
| --- | --- |
| Write a worker's brief | `spp dispatch <N> --driver <d>` (it refuses an issue that is held); `spp brief <N>` writes the file alone |
| Start a worker | per driver, with the brief's path as the prompt |
| Wake when work changes | `spp wait <epic>` run in the background; desktop and subagent workers also wake you |
| Resume a worker | message the same worker by name |
| Start the fresh reviewer | the `review` skill starts it |
| Settle a design | the `grilling` skill, then `domain-modeling` |

Done when the driver is named and the Claude Code reference is read.

## 3. The worker's report

A worker ends with one JSON object: `status` is `DONE`, `DONE_WITH_CONCERNS`, `BLOCKED` or `NEEDS_CONTEXT`; `pr` and `verifySha` are `null` when no pull request opened. A session driver may not hand you the report. The state is still readable then: the issue's progress comment shows a hand-back's route and reason, and the pull request body's Notes for the reviewer holds the concerns.

Read it before you gate and act on it. Never ignore an escalation, and never re-run a worker unchanged.

- `DONE`: gate the pull request.
- `DONE_WITH_CONCERNS`: a doubt about correctness or scope is answered, or the worker is sent back, before the gate. An observation is noted and the gate proceeds. An `Interfaces changed:` line is an **Interface deviation**, recorded at the merge.
- `NEEDS_CONTEXT`: the report opens with its kind. A **missing fact** (a path, a value, a name the code or the user knows) is supplied and the worker resumed. An **unsettled design** (several valid approaches and the Epic does not choose, or its decision contradicts the code) leaves the worker stopped while you settle it, as the path's reference file says.
- `BLOCKED`: decide what changes. More context: resume. More capability: dispatch again on a higher tier. A smaller issue: split it into Sub-issues with blocked-by edges. A wrong plan: fix the issue body and record the ruling.

Done when each report has a named next action.

## 4. Run the path

Read the reference file for the kind from step 1 now and follow it. It calls back to steps 2 and 3 for the driver and the report, and it ends the run.

## Heartbeat

Whenever you are woken, or you surface to the user, print one line per live worker: the issue, its state and its latest note with the note's age. The sources are `spp status <epic>` and `spp note --list <epic>`; a One-off has no Epic, so its line comes from the issue's progress comment. Read no worker's transcript and invent no state: a worker with no note is "no update since dispatch".

## Guardrails

- A worker's tier follows the shape of its issue, never a vendor model name. A mid tier for a well-specified issue in one subsystem with an in-repo pattern to copy; the ceiling tier for cross-cutting, schema or design-judgment work, and for any issue that already bounced once. Set it wherever the driver takes one, since an unset tier inherits yours.
- Readiness comes from GitHub (open, unblocked, unheld, `ready-for-agent`) and `spp` computes it; no status label says "in progress".
- Every issue comment goes through `spp progress`, `spp plan`, `spp wave` or `spp hand-back`, which keep one Marker comment each.
- Start workers on issues nobody holds, and never claim for them: the worker claims in its first step.
- `/review-panel`, `/close-epic` and `/triage` are user-invoked. Name them to the user; the Skill tool cannot start them.
- A merge conflict is never resolved by you: the worker rebases.
- One Epic or One-off per run.
