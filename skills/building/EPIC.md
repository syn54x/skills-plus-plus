# The Epic path

Read only when `spp kind` says `epic`. `<epic>` is the Epic's number or URL. The loop is one rule: run `spp next <epic> --json`, do every action in its `actions` array, run it again. It ends at `close` or `stuck`. The first `spp next` of each run is `spp next <epic> --json --resume`, and every later one drops `--resume`: a run that starts on an Epic already under way may follow a session that died with its workers, and `--resume` returns each issue they left claimed with no pull request and no assignee as a `hand-back` saying `worker lost`.

Keep a running list: each issue whose worker this build started, from its start until the worker reports back. Every `spp next` passes it as `--running <tickets>`, comma-separated, each issue in the form the `dispatch` action named it (a number, `owner/repo#N` or a URL); leave the flag off while the list is empty. `spp` holds each one in any state, landed included, so an issue whose worker has not reported back, and any fix pull request of its, is never dispatched, gated or sent to a fix round again, `main-gate` waits for it, and no issue that shares its files runs beside it. Add an issue when its worker starts or is resumed; take it off when the worker reports back or its start fails. A new session starts with an empty list.

Each action has a `kind`, the `tickets` and `pr` it concerns, and a `reason`. Handle by `kind`:

| Action | Do |
| --- | --- |
| `preflight` | Print the reason and its fix, and stop. The fix is the user's (a newer `gh`, `/to-tickets`, `/setup-spp`). |
| `branch` | Create the integration branch. |
| `dispatch` | Approval of the first Wave, then start the workers. |
| `gate` | Gate the pull request. |
| `fix` | One fix round, for a slice or a fix pull request, by the worker this session started, or the user's call when that worker is gone (Fix round). |
| `hand-back` | The fix round is spent. Hand the issue back; for a fix pull request, see Hand-back. A reason saying `worker lost` goes to the user first, as Hand-back says. |
| `merge` | Merge the pull request. |
| `wait` | Wait for the next change. |
| `main-gate` | The Epic's pull request to the base branch. |
| `close` | Point the user at `/close-epic <epic>`. |
| `stuck` | Print the reason and stop. A cycle or a missing label needs a person. |

When one run prints several actions, do them together: the workers of one dispatch start in one batch, and the gates of separate pull requests run side by side.

**The end of a Wave** is the moment `spp next` prints `dispatch` for any Wave after the first, `main-gate` with no pull request, `close` or `stuck`. Run the checkpoint (`SKILL.md`, Checkpoint) then, before you act on that action. A `gate`, `fix` or `merge` in the same run is mid-step: finish it, run `spp next` again, and check once more.

## Branch

Run `spp branch <epic>`. It cuts `feat/<slug>` from `origin/<base>`, pushes it and records it on the plan comment. The base is the default branch; when the Epic's plan comment names another in its Constraints, pass `--from <base>`. In a multi-repo Epic each repo that has a Sub-issue gets its own branch of the same name, made from a worktree of that repo's checkout and never by switching the user's.

## Dispatch

The tickets in the action are one **Wave**: ready, with no two owning the same file, as `spp` checked. Take them as given.

**First Wave only: ask.** It is the first Wave when the Epic's wave comment lists none (`gh issue view <epic> --comments`, looking for `Wave 1:`). End your turn with one message whose first line is the waiting line (`SKILL.md`, Waiting on the user): "#<epic> waits on you: start Wave 1 with these <n> issues? Reply yes, or say what to change." The table follows it, from `spp wave plan <epic>` and each issue's size label: issue, size, Files owned, tier, and the held-back issues with their reasons.

Wait for the user's yes. When the parent session relays an answer, quoted as the user's words, it is the user's answer: act on it as if typed here. Later Waves that follow the plan start on their own; a new blocked-by edge, a re-bundled issue or a changed tier comes back to the user first, asked the same way.

Then, for each issue in the action:

1. Write its brief and start its worker as step 2 of `SKILL.md` says, and add the issue to the running list. A worker's first commands cut `sdd/<N>-<slug>` from the integration branch, so the checkout it starts on does not matter.
2. Record the Wave once: `spp wave <epic> add --n <wave> --tickets <issues> --workers <names> --started <ISO8601> --edges none`. `<wave>` is one more than the Waves already listed. List an edge as `consumer<producer` only for a blocked-by edge you added yourself.

Done when every issue in the action has a worker and the Wave is recorded.

## Gate

Read the worker's report first (step 3 of `SKILL.md`). Then call the Skill tool with "review" for the pull request. It starts the fresh reviewer, runs the issue's Verify block, and records the spec and quality verdicts on the pull request. Run `spp next` again; the verdicts decide the next action.

Take the issue number from the action's `tickets` entry, or for a fix from the body's `Refs #N` line; a slice's body also has a `Closes #N` line. GitHub does not link a closing keyword on a pull request into a branch that is not the default, so its own link is empty.

## Fix round

The action names the issue and its pull request. When this session started the worker that opened it, resume that worker (step 2 of `SKILL.md`) with the Critical and Important findings, verbatim, and the instruction to plan and make the fix as its fix round says, push and re-run Verify; it holds the context. Put the issue back on the running list until it reports. Then gate the new head. One round per pull request. A second failed head, or CI red after the fix, comes back as `hand-back`.

A worker this session did not start (no agent id kept for it) is gone: a subagent worker dies with its Build session, so on a resumed build the `t-<N>` that opened the pull request no longer answers. Never message it, and start no worker in its place. End your turn with a waiting line, the findings after it: "#<epic> waits on you: <pull request> on #<N> needs a fix round, and the worker that opened it died with an earlier session. Hand #<N> back, or take the pull request over yourself?" On "hand it back", run `spp hand-back <N> ready-for-human --reason "<the open findings>; its worker died with an earlier session"` and leave the pull request open; for a fix pull request, do what Hand-back says for one instead. On "I take it", the pull request is the user's: ask nothing more about it, and the head they push is gated as usual.

## Hand-back

A `hand-back` for a fix pull request needs none of this. It is a fix when the action's `pr` is not the Sub-issue's own pull request, or its reason ends "no Sub-issue is relabelled". Report its open findings to the user, leave the pull request open, and write nothing to the issue or the wave comment. A `hand-back` whose reason says `worker lost` goes to the user first, as Wait below says. For any other, run `spp hand-back <N> ready-for-human --reason "<the open findings>"`. Leave the pull request open, and record it with `spp wave <epic> pr --ticket <N> --pr <URL>`. The issue now idles in `spp next`; carry on with what else is ready. The Epic ends at `stuck` if nothing else can move, and you report the handed-back issue to the user.

## Merge

Run `spp merge <pr>`. It merges only a pull request that passed its gate, whose blockers merged and whose checks are green, and records it on the Wave comment. Read its exit:

- `0`: merged. Close the Sub-issue if it is still open: `gh issue close <N> --reason completed --comment "Merged in <pr> into <branch>"`, since a merge into a non-default branch closes nothing by itself. Then, from a throwaway worktree of the integration branch's tip, run `spp verify <N>`, never the block's commands by hand: it runs the merged issue's Verify block only while it matches its pin. Red, or a refusal, stops the loop and goes to the user as a waiting line naming the failed command, because a broken base poisons every later Wave.
- `3`: `rebase needed`. Resume the same worker (step 2 of `SKILL.md`) with "rebase onto the current integration branch and re-run Verify". Put the issue back on the running list until it reports. When this session did not start that worker, it is gone: start none, and ask the user as Fix round says, with the rebase in place of the findings. The new head is gated again. You never resolve the conflict, since silently picking a side discards one issue's intent.
- `1`: print the refusal and stop on that pull request.

An `Interfaces changed:` line in the output is an Interface deviation. Before the next dispatch, rewrite the producer's Produces line and every consumer's Consumes line to the shipped signature (`gh issue edit <N> --body-file <file>`), then record it: `spp plan <epic> --add-deviation "<issue>: <old> -> <new>"`. No approval is needed, since the gate already judged it needed.

Merges move the frontier: run `spp next` after each one, and the newly unblocked issues arrive as the next Wave.

## Wait

Run `spp wait <epic>` in the background and do nothing else. It exits with one line per change, a state moving (`#12 claimed -> pr-open`) or a fix pull request's, or with one `heartbeat:` line when nothing changed for its timeout; on exit, print the line and run `spp next`. A worker that ends wakes you itself. On the first `spp next` of a run, `--resume` returns `hand-back` for each claimed issue with no pull request and no assignee, its reason saying `worker lost`. For that one, do not run the Hand-back step: ask the user, as a waiting line, whether to hand the issue back with `spp hand-back <N> needs-info --reason "worker lost"` or to start a worker on it again, since its claim would otherwise hold it forever. Before you ask, find what the lost worker left and name each in the question: its local worktree (`git worktree list`, the one on an `sdd/<N>-*` branch), its local branch (`git branch --list 'sdd/<N>-*'`) and a pushed one (`git ls-remote origin 'refs/heads/sdd/<N>-*'`). A restarted worker cuts a fresh `sdd/<N>-<slug>` from the integration branch and cannot push over a branch the lost worker pushed, so when one exists the user deletes it (`git push origin --delete <branch>`, its commits lost) or hands the issue back. To start one again, once the user agrees, remove the lost worker's worktree and local branch as the harness reference's Cleanup says for a dead worker, then run `spp unclaim <N>`, since `spp dispatch` refuses a held issue; the next `spp next` dispatches it. Ask the same when a wait outlasts any sign of life (no note, no report). An issue a person holds by assignment is theirs; it is never a lost worker.

## Settling an unsettled design

A `NEEDS_CONTEXT` of that kind arrives as a handed-back issue. The decision belongs to the user; you bring the facts from the code and the Epic, and each question you put to them is a waiting line.

1. Call the Skill tool with "grilling" on the question, and open each of its rounds with the waiting line, since `grilling` knows nothing of it.
2. When the answer is hard to reverse, call the Skill tool with "domain-modeling" to record it as an ADR.
3. Write it into the Epic body as one `## Spec deltas` item: MODIFIED, ADDED, or REMOVED when the user drops the behaviour. Create the section when it is missing. `close-epic` later confirms each one shipped.
4. Rewrite the What to build, Interfaces and Test scenarios of the stopped issue and of every issue whose Consumes or Produces line the decision changes (`gh issue edit <N> --body-file <file>`). A dropped behaviour closes its issue instead: `gh issue close <N> --reason "not planned"`.
5. Record it: `spp plan <epic> --add-deviation "<issue>: <decision in one line>"`.
6. When this session started the stopped issue's worker, restore `ready-for-agent` on the issue, remove its `needs-info` label, resume the worker (step 2 of `SKILL.md`) with the rewritten issue, and put the issue back on the running list until it reports. When it did not, that worker died with an earlier session: start none and leave the labels. Ask with a waiting line whether to hand the issue to a person (`spp hand-back <N> ready-for-human --reason "<the decision>; its worker died with an earlier session"`, any pull request left open) or the user takes it over.

## Main gate

`main-gate` without a pull request: open one from the integration branch into the base. Call the Skill tool with "pr" for the body, and make its first line `Closes #<epic>` when the Epic is in the same repo (`Epic: owner/repo#N` otherwise, since a closing keyword would close an Epic in another repo early). Run `spp next` again: with the pull request open, the action says whether the panel runs.

`main-gate` with a pull request names the gate:

- **The panel runs** (four or more Sub-issues, any size L, or 1,000 changed lines, as the reason says). `/review-panel` is user-invoked, so the Skill tool cannot start it: you walk its steps yourself. Read `review-panel`'s `SKILL.md` (`CLAUDE-CODE.md` says where it sits) and do what its steps say, in this order:
  1. **Number.** Resolve the action's pull request to its number, `PR`, as its step 1 does. Every later step, and the fan-out, take the number, never the URL. You already know the Epic, so skip its `spp kind` check.
  2. **Folder, Spec, Personas.** Its steps 2 to 4, as written: the panel directory and this round's folder (`R=1` on the first run), the Spec and Coherence sections from a fresh reviewer, and the list of Persona names.
  3. **Fan out.** Its step 5: start the panel's fan-out with `PR` and the Persona names from step 4 (see the harness reference, `CLAUDE-CODE.md`), and write each Persona's reply to the round's folder. Where the harness offers no fan-out, step 5 says how to start the reviewers yourself.
  4. **Merge and read the verdict.** Its step 6: `spp findings merge "$ROUND_DIR"/*.json --verdict "$R"` with the readings you hold, then read the output's last line, `Verdict: MERGE`, `FIX FIRST` or `HUMAN DECISION`. That line is the gate's verdict; write the report around it and record the round on the wave comment as that step says.
- **No panel.** Call the Skill tool with "review" for the pull request. It reads the Epic's pull request in its Epic mode and returns one spec verdict with a coherence check.

On a failing verdict (FIX FIRST, or a spec failure), send each Critical and Important finding to the worker that owns the file, by Files owned; a class of finding that cuts across files goes whole to one worker. A fix is a new pull request into the integration branch, from the resumed worker following its fix round, whose body opens with `Refs #<Sub-issue>` and names the finding. A finding whose owner this session did not start goes to no worker: put it to the user in a waiting line, to fix it themselves or leave it open. From there follow `spp next`: it prints `gate`, `fix`, `merge` or `hand-back` for each fix as for a slice (the fix is reviewed through the "review" skill, which records its verdict against the Sub-issue), and `main-gate` again only once no fix is open. `spp merge` merges a fix.

After the round, run again whichever main gate `spp next` names: the panel by `review-panel`'s `ROUNDS.md` step 2 (with `R` one more than the last round, merged with `--verdict "$R"` as before), or the single review spec verdict. At most two fix rounds: a re-review still at FIX FIRST, or a spec verdict still at FAIL, after the second ends as HUMAN DECISION. On MERGE or a spec PASS, or HUMAN DECISION with its open findings, give the user the report and the pull request and stop. You do not merge to the base branch.

## Close

`close` means the pull request to the base branch merged. Tell the user to run `/close-epic <epic>`; it writes the summary and the retro and closes the Epic. Then remove the finished workers' worktrees (see `CLAUDE-CODE.md`). If the session ends before the user merges, say so: `/close-epic` runs from GitHub state alone in any later session.

Finish with one table: issue, tier, pull request, state (merged, handed back, open), and anything cut, deferred or edited in the plan. The table also lists the Skill feedback this run's checkpoints offered, one row each: filed (with its issue link), skipped or left for later.
