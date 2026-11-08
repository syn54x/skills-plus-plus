# The Epic path

Read only when `spp kind` says `epic`. `<epic>` is the Epic's number or URL. The loop is one rule: run `spp next <epic> --json`, do every action in its `actions` array, run it again. It ends at `close` or `stuck`.

Each action has a `kind`, the `tickets` and `pr` it concerns, a `reason`, and on `dispatch` the `driver`: the one the plan comment records (`desktop`, `bg` or `subagent`), or else `bg` or `subagent` as `spp` detected from the messaging socket. Step 2 of `SKILL.md` uses it. Handle by `kind`:

| Action | Do |
| --- | --- |
| `preflight` | Print the reason and its fix, and stop. The fix is the user's (a newer `gh`, `/to-tickets`, `/setup-spp`). |
| `branch` | Create the integration branch. |
| `dispatch` | Approval of the first Wave, then start the workers. |
| `gate` | Gate the pull request. |
| `fix` | One fix round by the same worker, for a slice or a fix pull request. |
| `hand-back` | The fix round is spent. Hand the issue back; for a fix pull request, see Hand-back. A reason saying `worker lost` goes to the user first, as Hand-back says. |
| `merge` | Merge the pull request. |
| `wait` | Wait for the next change. |
| `main-gate` | The Epic's pull request to the base branch. |
| `close` | Point the user at `/close-epic <epic>`. |
| `stuck` | Print the reason and stop. A cycle or a missing label needs a person. |

When one run prints several actions, do them together: the workers of one dispatch start in one batch, and the gates of separate pull requests run side by side.

## Branch

Run `spp branch <epic>`. It cuts `feat/<slug>` from `origin/<base>`, pushes it and records it on the plan comment. The base is the default branch; when the Epic's plan comment names another in its Constraints, pass `--from <base>`. In a multi-repo Epic each repo that has a Sub-issue gets its own branch of the same name, made from a worktree of that repo's checkout and never by switching the user's.

## Dispatch

The tickets in the action are one **Wave**: ready, with no two owning the same file, as `spp` checked. Take them as given.

**First Wave only: ask.** It is the first Wave when the Epic's wave comment lists none (`gh issue view <epic> --comments`, looking for `Wave 1:`). Show one table from `spp wave plan <epic>` and each issue's size label: issue, size, Files owned, tier, and the held-back issues with their reasons. When the session can start desktop linked sessions, ask in the same message which Driver to use, with one row per Driver available here:

| Driver | Waves start | You see | Cost |
| --- | --- | --- | --- |
| Desktop linked sessions | Only on a user message: one per Wave after the first, because the app refuses to start a session on a turn an automated wake-up started | A sidebar row per worker, which you can open and steer | The run waits on you at every Wave boundary |
| Background sessions (when the messaging socket is present) | On their own | `claude agents` and `claude attach t-<N>` | Workers take no tier and inherit the orchestrator's model |
| Subagents | On their own, including on wake-ups | Only what the orchestrator reports | No direct steering of a worker |

Wait for the user's yes, with their Driver when you asked. Record it before starting any worker: `spp plan <epic> --driver desktop|bg|subagent`; from then on `spp next` reports it on `dispatch`. A resumed run uses the recorded Driver and does not ask again. When that Driver is not available in this session (`desktop` recorded, now running in a terminal), take the best Driver step 2 of `SKILL.md` detects for this run, tell the user so, and leave the record unchanged. Later Waves that follow the plan start on their own; a new blocked-by edge, a re-bundled issue or a changed tier comes back to the user first.

Then, for each issue in the action:

1. Write its brief and start its worker on the driver from step 2 of `SKILL.md`. A worker's first commands cut `sdd/<N>-<slug>` from the integration branch, so the checkout it starts on does not matter.
2. Record the Wave once: `spp wave <epic> add --n <wave> --tickets <issues> --workers <names> --started <ISO8601> --edges none`. `<wave>` is one more than the Waves already listed. List an edge as `consumer<producer` only for a blocked-by edge you added yourself.

Done when every issue in the action has a worker and the Wave is recorded.

## Gate

Read the worker's report first (step 3 of `SKILL.md`). Then call the Skill tool with "review" for the pull request. It starts the fresh reviewer, runs the issue's Verify block, and records the spec and quality verdicts on the pull request. Run `spp next` again; the verdicts decide the next action.

Take the issue number from the action's `tickets` entry, or for a fix from the body's `Refs #N` line; a slice's body also has a `Closes #N` line. GitHub does not link a closing keyword on a pull request into a branch that is not the default, so its own link is empty.

## Fix round

The action names the issue and its pull request. Send the Critical and Important findings, verbatim, to the same worker (it holds the context) with the instruction to plan and make the fix as its fix round says, push and re-run Verify; then gate the new head. One round per pull request. A second failed head, or CI red after the fix, comes back as `hand-back`.

## Hand-back

A `hand-back` for a fix pull request needs none of this. It is a fix when the action's `pr` is not the Sub-issue's own pull request, or its reason ends "no Sub-issue is relabelled". Report its open findings to the user, leave the pull request open, and write nothing to the issue or the wave comment. A `hand-back` whose reason says `worker lost` goes to the user first, as Wait below says. For any other, run `spp hand-back <N> ready-for-human --reason "<the open findings>"`. Leave the pull request open, and record it with `spp wave <epic> pr --ticket <N> --pr <URL>`. The issue now idles in `spp next`; carry on with what else is ready. The Epic ends at `stuck` if nothing else can move, and you report the handed-back issue to the user.

## Merge

Run `spp merge <pr>`. It merges only a pull request that passed its gate, whose blockers merged and whose checks are green, and records it on the Wave comment. Read its exit:

- `0`: merged. Close the Sub-issue if it is still open: `gh issue close <N> --reason completed --comment "Merged in <pr> into <branch>"`, since a merge into a non-default branch closes nothing by itself. Then, from a throwaway worktree of the integration branch's tip, run `spp verify <N>`, never the block's commands by hand: it runs the merged issue's Verify block only while it matches its pin. Red, or a refusal, stops the loop and goes to the user, because a broken base poisons every later Wave.
- `3`: `rebase needed`. Resume the same worker with "rebase onto the current integration branch and re-run Verify". The new head is gated again. You never resolve the conflict, since silently picking a side discards one issue's intent.
- `1`: print the refusal and stop on that pull request.

An `Interfaces changed:` line in the output is an Interface deviation. Before the next dispatch, rewrite the producer's Produces line and every consumer's Consumes line to the shipped signature (`gh issue edit <N> --body-file <file>`), then record it: `spp plan <epic> --add-deviation "<issue>: <old> -> <new>"`. No approval is needed, since the gate already judged it needed.

Merges move the frontier: run `spp next` after each one, and the newly unblocked issues arrive as the next Wave.

## Wait

Run `spp wait <epic>` in the background and do nothing else. It exits with one line per change, a state moving (`#12 claimed -> pr-open`) or a worker that stopped (`t-12 done`), or with one `heartbeat:` line when nothing changed for its timeout; on exit, print the line and run `spp next`. A claimed issue with no pull request whose worker stopped is no longer waited on: `spp next` returns `hand-back` for it, its reason saying `worker lost`. For that one, do not run the Hand-back step: ask the user whether to hand the issue back with `spp hand-back <N> needs-info --reason "worker lost"` or to start a worker on it again, since its claim would otherwise hold it forever. To start one again, run `spp unclaim <N>` first, since `spp dispatch` refuses a held issue; the next `spp next` dispatches it. A new worker cuts its `sdd/<N>-*` branch from the base again and cannot push over one the lost worker pushed, so when that branch exists, name it in the question: the user deletes it (its commits are lost) or hands the issue back. Ask the same when a wait outlasts any sign of life (no note, no session). An issue a person holds by assignment is theirs; it is never a lost worker.

## Settling an unsettled design

A `NEEDS_CONTEXT` of that kind arrives as a handed-back issue. The decision belongs to the user; you bring the facts from the code and the Epic.

1. Call the Skill tool with "grilling" on the question.
2. When the answer is hard to reverse, call the Skill tool with "domain-modeling" to record it as an ADR.
3. Write it into the Epic body as one `## Spec deltas` item: MODIFIED, ADDED, or REMOVED when the user drops the behaviour. Create the section when it is missing. `close-epic` later confirms each one shipped.
4. Rewrite the What to build, Interfaces and Test scenarios of the stopped issue and of every issue whose Consumes or Produces line the decision changes (`gh issue edit <N> --body-file <file>`). A dropped behaviour closes its issue instead: `gh issue close <N> --reason "not planned"`.
5. Record it: `spp plan <epic> --add-deviation "<issue>: <decision in one line>"`.
6. Restore `ready-for-agent` on the stopped issue and remove its `needs-info` label. Resume its worker with the rewritten issue if the session still answers to its name; otherwise `spp next` dispatches a fresh one.

## Main gate

`main-gate` without a pull request: open one from the integration branch into the base. Call the Skill tool with "pr" for the body, and make its first line `Closes #<epic>` when the Epic is in the same repo (`Epic: owner/repo#N` otherwise, since a closing keyword would close an Epic in another repo early). Run `spp next` again: with the pull request open, the action says whether the panel runs.

`main-gate` with a pull request names the gate:

- **The panel runs** (four or more Sub-issues, any size L, or 1,000 changed lines, as the reason says). `/review-panel` is user-invoked, so the Skill tool cannot start it: you walk its steps yourself. Read `review-panel`'s `SKILL.md` (`CLAUDE-CODE.md` says where it sits) and do what its steps say, in this order:
  1. **Number.** Resolve the action's pull request to its number, `PR`, as its step 1 does. Every later step, and the fan-out, take the number, never the URL. You already know the Epic, so skip its `spp kind` check.
  2. **Folder, Spec, Personas.** Its steps 2 to 4, as written: the panel directory and this round's folder (`R=1` on the first run), the Spec and Coherence sections from a fresh reviewer, and the list of Persona names.
  3. **Fan out.** Its step 5: start the panel's fan-out with `PR` and the Persona names from step 4 (see the harness reference, `CLAUDE-CODE.md`), and write each Persona's reply to the round's folder. Where the harness offers no fan-out, step 5 says how to start the reviewers yourself.
  4. **Merge and read the verdict.** Its step 6: `spp findings merge "$ROUND_DIR"/*.json --verdict "$R"` with the readings you hold, then read the output's last line, `Verdict: MERGE`, `FIX FIRST` or `HUMAN DECISION`. That line is the gate's verdict; write the report around it and record the round on the wave comment as that step says.
- **No panel.** Call the Skill tool with "review" for the pull request. It reads the Epic's pull request in its Epic mode and returns one spec verdict with a coherence check.

On a failing verdict (FIX FIRST, or a spec failure), send each Critical and Important finding to the worker that owns the file, by Files owned; a class of finding that cuts across files goes whole to one worker. A fix is a new pull request into the integration branch, from the resumed worker following its fix round, whose body opens with `Refs #<Sub-issue>` and names the finding. From there follow `spp next`: it prints `gate`, `fix`, `merge` or `hand-back` for each fix as for a slice (the fix is reviewed through the "review" skill, which records its verdict against the Sub-issue), and `main-gate` again only once no fix is open. `spp merge` merges a fix.

After the round, run again whichever main gate `spp next` names: the panel by `review-panel`'s `ROUNDS.md` step 2 (with `R` one more than the last round, merged with `--verdict "$R"` as before), or the single review spec verdict. At most two fix rounds: a re-review still at FIX FIRST, or a spec verdict still at FAIL, after the second ends as HUMAN DECISION. On MERGE or a spec PASS, or HUMAN DECISION with its open findings, give the user the report and the pull request and stop. You do not merge to the base branch.

## Close

`close` means the pull request to the base branch merged. Tell the user to run `/close-epic <epic>`; it writes the summary and the retro and closes the Epic. Then remove the finished workers' worktrees (see `CLAUDE-CODE.md`). If the session ends before the user merges, say so: `/close-epic` runs from GitHub state alone in any later session.

Finish with one table: issue, tier, pull request, state (merged, handed back, open), and anything cut, deferred or edited in the plan.
