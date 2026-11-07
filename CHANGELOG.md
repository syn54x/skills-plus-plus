# @syn54x/spp

## 2.3.0

### Minor Changes

- 2d5b628: The epic board now lists an Epic's fix pull requests in a `Fixes` group after the Waves: one row per open or merged fix with a `fix open` or `fix merged` chip, its number, the Sub-issue its `Refs` line names (or `unattributed`) and a `PR` button that copies its link. While the Epic has any fix, the board header and the status line end with the open count, as in `12/12 merged · 3 fixes open`. A failing pull request read keeps the ticket rows and shows its error. A board stored by an earlier version is dropped and redrawn on the next refresh.
- 2d5b628: `spp merge` now merges a Fix pull request: one that closes no Sub-issue of its Epic but `Refs` a Sub-issue, with a trusted passing verdict on its head, the Epic's integration branch as base and passing checks. It writes nothing to the wave comment, and a pull request that closes no issue and refs no Sub-issue is refused.
- 2d5b628: `spp next` now routes an Epic's Fix pull requests the way it routes a slice: `gate` when its checks pass and its head has no verdict, `fix` once after a failed head (naming the failing runs when checks are the cause), `hand-back` naming the pull request after a second failed head, `merge` on a passing verdict, and `wait` while its checks are pending or its Sub-issue's worker is running. An unattributed fix is never gated or merged: it is reported under `wait`, or `stuck` when nothing else is in flight, with the way out (add `Refs #<Sub-issue>` to its body, or close it). `main-gate` now prints only once no fix is open. The action shape is unchanged.
- 2d5b628: The `review` skill now gates a Fix pull request: one with no closing line that opens `Refs #N` for a Sub-issue and targets its Epic's integration branch gets both verdicts, the Sub-issue's Verify block, and a verdict marker recorded with `spp verdict --ticket N`. `build`'s Main gate follows `spp next` for fixes (`gate`, `fix`, `merge` or `hand-back`) and `spp merge` merges them, so the orchestrator no longer merges a fix by hand.
- 2d5b628: `spp status` now lists an Epic's Fix pull requests: trusted pull requests into its integration branch that close no Sub-issue, open or merged (ADR 0011). The text view prints them under a `Fixes` heading after the Layers, one line each with its state, its number and the Sub-issue its `Refs` line names or `unattributed`, and the header line ends with the open count, as in `(3 fixes open)`; with no fixes it prints neither. `--json` carries the same list as `fixes` on the Epic state, each with `ticket` set to the Sub-issue's URL or null. `spp wait` exits with a change line when a fix appears, merges or goes (`#77 OPEN -> MERGED`), gets a new head after a fix round or gets the gate's verdict (`#77 OPEN -> OPEN (new head)`). The snapshot makes one more GraphQL request per repo of the Epic (its own, each Sub-issue's and each the plan names) for the list, only when the plan comment records an integration branch; a repo that is not there or not readable is warned about on stderr once and loses only its fixes, while any other failure fails the command. `snapshot.ts` exports `pullRequestsArgs(snapshot)`, `fixRepos`, `withPullRequests` and `readPullRequests` for the epic board.
- 3c14c8d: `/to-tickets` now checks the set for values worked out twice. When one Sub-issue works a value out from another module's output (a client inferring each row's state from a summary the server returns), it asks whether the module that holds the inputs should produce the value itself. If so, the producer gains a Produces line or a Sub-issue of its own before anything is released, and the consumer reads the value. A derivation you meant to keep is yours to accept.

### Patch Changes

- 8856ea4: `spp dispatch <issue> --driver subagent` now refuses a folder that is not inside a git repository, before it reads GitHub. The `spp:worker` agent cuts its worktree from the session's folder, so every worker started from such a folder failed with `Cannot create agent worktree: not in a git repository`. The refusal says to run `/build` from inside the checkout of the repository that owns the issue, or to choose another Driver. The `bg` and `desktop` Drivers are unchanged.
- 2d5b628: A Fix pull request in `EpicState.fixes` now carries its `gate` on the current head, computed once, and `spp next` reads it. The way out for an unattributed fix names `Refs #<Sub-issue>` only, since `Closes` on a closed Sub-issue makes the pull request that ticket's own.
- f197712: The stop hook, `spp verify --check`, now ends its refusal on a `Stop` event with one more sentence: if this is a worker's worktree and you are not that worker, cd back to your own checkout and stop again. The hook judges the tree the session stands in and cannot tell whose work is there. An orchestrator whose shell was left inside a worker's worktree was therefore refused at the end of every turn until the worker committed, and one run polled through 18 fix rounds that way. `build` on Claude Code now tells the orchestrator to read a worker's worktree with `git -C <path>` and to stay out of it. A `SubagentStop` refusal and a run by hand print what they printed before, and which stops are refused has not changed.

## 2.2.0

### Minor Changes

- 5a6a9ac: New skill `discuss`: type `/discuss <idea>`, or say you want to brainstorm or kick an idea around, and the agent talks a vague idea over with you before it is a plan, then names where it should go next. It is experimental, so it may change or be removed.
- 1ca3abf: `/epic-board` with no argument now picks the Epic itself: the parent of an `sdd/<N>-*` branch, the Epic whose plan records a `feat/<slug>` branch, or the one Epic in flight in the repo. With several in flight it lists them; with none it says so.

## 2.1.0

### Minor Changes

- b402fe2: In the Claude desktop app, `/build` now asks which Driver to use when you approve an Epic's first Wave, since desktop linked sessions start each later Wave only on a message from you. `spp plan <epic> --driver desktop|bg|subagent` records the choice and `spp next` reports it on `dispatch`, so a resumed run reuses it.

### Patch Changes

- 5cc096f: Credit each skill's sources: a skill that drew on an incumbent now lists them under `metadata.credits` in its frontmatter, with a `CREDITS.md` beside it saying which part came from where.

## 2.0.1

### Patch Changes

- f1fe2bd: Shorten every model-invoked skill's description to one clause and its triggers, so Claude reaches for skills like `pr` and `tdd` on its own again.

## 2.0.0

### Major Changes

- b3d5eb3: spp 2.0.0: the rebuild of S++ as the `spp` plugin and the `@syn54x/spp` command-line tool, on a flat skill layout, with GitHub Issues as the only state and a Verify pin that guards every run of an issue's Verify block.
