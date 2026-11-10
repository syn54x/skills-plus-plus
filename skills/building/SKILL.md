---
name: building
description: Build an Epic or a hardened One-off into pull requests. Use when told to build a specific Epic or issue number.
metadata:
  credits:
    - skill: implement-spec
      author: Matt Pocock
      url: "https://github.com/mattpocock/skills/tree/main/skills/engineering/implement-spec"
    - skill: subagent-driven-development
      author: Jesse Vincent
      url: "https://github.com/obra/superpowers/tree/main/skills/subagent-driven-development"
    - skill: openspec-sync-specs
      author: OpenSpec Contributors
      organisation: Fission AI
      url: "https://github.com/Fission-AI/OpenSpec/tree/main/skills/openspec-sync-specs"
---

You are the orchestrator of the build of issue N. Workers write the code, a fresh reviewer gates each pull request, and you route between them. You never edit source and you never merge to the base branch; a person does that.

You hold no state. Every decision comes from `spp kind` or `spp next`, which read GitHub, so a lost session loses nothing and resuming is starting `building` on N again. When a command's output and your memory disagree, the output wins.

Input: an issue number, or its URL when the Epic spans repos.

## 1. Kind

Run `spp kind <N>`. It prints the kind and the reason.

| Kind | Meaning | Do |
| --- | --- | --- |
| `epic` | N has Sub-issues | The Epic path, [`EPIC.md`](EPIC.md), once steps 2 and 3 are read. |
| `sub-issue` | N carries the Ticket contract and has a parent Epic | Stop with a waiting line asking the user to run `/build <epic>` on that parent, then the reason. A Sub-issue is built through its Epic, never the One-off path. |
| `one-off` | N carries the Ticket contract and has no Epic: a hardened One-off | The One-off path, [`ONE-OFF.md`](ONE-OFF.md), once steps 2 and 3 are read. |
| `raw` | N lacks the contract | Stop with a waiting line asking the user to run `/triage <N>`, then the reason. A raw issue never reaches a worker. |

Done when you hold the kind and, for `sub-issue` or `raw`, the user has the reason.

## 2. Workers

Each worker is one isolated subagent, the `spp:worker` agent, in a worktree of its own. It keeps one contract: an issue number goes in, a pull request comes out, all state lives in GitHub. Nothing asks or records how workers run. On Claude Code, [`CLAUDE-CODE.md`](CLAUDE-CODE.md) names the tool or command behind each capability here; read it now.

| Capability | How |
| --- | --- |
| Write a worker's brief | `spp dispatch <N>` (it refuses an issue that is held); `spp brief <N>` writes the file alone |
| Start a worker | one `spp:worker` subagent, with the brief's path as the prompt |
| Wake when work changes | `spp wait <epic>` run in the background; a worker also wakes you when it ends |
| Resume a worker | message the same worker at the address its start returned; one this session did not start died with its session, so `EPIC.md` starts a fresh one |
| Start the fresh reviewer | the `review` skill starts it |
| Settle a design | the `grilling` skill, then `domain-modeling` |

Done when the Claude Code reference is read.

## 3. The worker's report

A worker ends with one JSON object: `status` is `DONE`, `DONE_WITH_CONCERNS`, `BLOCKED` or `NEEDS_CONTEXT`; `pr` and `verifySha` are `null` when no pull request opened. When a worker stops without one, the state is still readable: the issue's progress comment shows a hand-back's route and reason, and the pull request body's Notes for the reviewer holds the concerns.

Read it before you gate and act on it. Never ignore an escalation, and never re-run a worker unchanged.

- `DONE`: gate the pull request.
- `DONE_WITH_CONCERNS`: a doubt about correctness or scope is answered, or the worker is sent back, before the gate. An observation is noted and the gate proceeds. An `Interfaces changed:` line is an **Interface deviation**, recorded at the merge.
- `NEEDS_CONTEXT`: the report opens with its kind. A **missing fact** (a path, a value, a name the code or the user knows) is supplied and the worker resumed. An **unsettled design** (several valid approaches and the Epic does not choose, or its decision contradicts the code) leaves the worker stopped while you settle it, as the path's reference file says.
- `BLOCKED`: decide what changes. More context: resume. More capability: dispatch again on a higher tier. A smaller issue: split it into Sub-issues with blocked-by edges. A wrong plan: fix the issue body and record the ruling.

Done when each report has a named next action.

## 4. Run the path

Read the reference file for the kind from step 1 now and follow it. It calls back to steps 2 and 3 for the workers and the report, and it ends the run.

## Checkpoint

A **checkpoint** offers the pending Skill feedback between steps. Run `spp feedback checkpoint` and follow what it prints; when it prints nothing, there is nothing to offer and you go on. Run it only at the points `EPIC.md` and `ONE-OFF.md` name, after one step has ended and before the next begins: never while a gate, a fix round or a merge is under way. A worker never runs it, so never put it in a worker's brief or message.

## Waiting on the user

Every turn that ends waiting on the user opens with one line, before anything else: `#<N> waits on you: <question>`, where N is the issue this run builds. The first Wave's approval, a lost worker, a red `spp verify` after a merge, an unsettled design and a wrong kind all ask this way, and so does any other question. The detail (a table, the findings, the reason) follows the line. A parent session may see only the opening of a child session's turn-end note, and `delegating` relays an answer only to a note that opens with this line, so a question placed anywhere else never reaches the user there.

## Heartbeat

Whenever you are woken, or you surface to the user, print one line per live worker: the issue, its state and its latest note with the note's age. The sources are `spp status <epic>` and `spp note --list <epic>`; a One-off has no Epic, so its line comes from the issue's progress comment. Read no worker's transcript and invent no state: a worker with no note is "no update since dispatch".

## Guardrails

- A worker's tier follows the shape of its issue, never a vendor model name. A mid tier for a well-specified issue in one subsystem with an in-repo pattern to copy; the ceiling tier for cross-cutting, schema or design-judgment work, and for any issue that already bounced once. Set it on every worker you start, since an unset tier inherits yours.
- Readiness comes from GitHub (open, unblocked, unheld, `ready-for-agent`) and `spp` computes it; no status label says "in progress".
- Every issue comment goes through `spp progress`, `spp plan`, `spp wave` or `spp hand-back`, which keep one Marker comment each.
- Start workers on issues nobody holds, and never claim for them: the worker claims in its first step.
- `/review-panel`, `/close-epic` and `/triage` are user-invoked. Name them to the user; the Skill tool cannot start them.
- A merge conflict is never resolved by you: the worker rebases.
- One Epic or One-off per run.
- Skill feedback is offered only at a checkpoint, by you, between steps; never mid-step and never through a worker.
