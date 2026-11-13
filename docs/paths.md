A path is a route through spp's skills, from the situation you start in to merged work. There are five, and each one below lists its steps in order with the skill that runs each step. [ask-spp](skills/ask-spp.md) places you on one when you are unsure which.

| Path | Start here when |
| --- | --- |
| [1. Epic](#1-epic) | A change is too large for one session, and you can see how to get there |
| [2. Single issue](#2-single-issue) | Someone filed a bug or an enhancement |
| [3. Unknown territory](#3-unknown-territory) | An effort is too large for one sitting, and the way there is not visible yet |
| [4. Scans](#4-scans) | Code resists change, you want a pull request's shape judged, or a suite carries tests that add no evidence |
| [5. Tiny unfiled work](#5-tiny-unfiled-work) | One session finishes the change, and nothing is filed |

Every path but the last needs the repo set up once with [setup-spp](skills/setup-spp.md), which writes the labels and the Routing block the other skills read.

## 1. Epic

If you have an idea that is not yet a plan, you can first explore it with [discuss](skills/discuss.md), an experimental skill. The step is optional, and you can skip it when you already know what you would build.

1. **Grill the plan.** [grill](skills/grill.md) asks until every choice is settled, recording terms and decisions as they land. [auto-grill](skills/auto-grill.md) runs the same interview but settles, with a citation, each question the code, ADRs or docs already answer.
2. **Write the spec.** [to-spec](skills/to-spec.md) turns the conversation into one Epic issue, asking nothing new.
3. **Cut the Sub-issues.** [to-tickets](skills/to-tickets.md) splits the Epic into vertical Sub-issues with blocking edges, and calls [harden](skills/harden.md) to give each one its Ticket contract.
4. **Build.** [build](skills/build.md) hands the Epic to [building](skills/building.md), which dispatches workers in Waves, each running [implement-issue](skills/implement-issue.md) in its own worktree. [review](skills/review.md) gates every slice pull request, and `building` merges the ones that pass in dependency order. Follow it on the [epic board](epic-board.md).
5. **Gate the pull request to main.** `building` picks the gate by size. A small Epic gets the [review](skills/review.md) spec verdict. One with four or more Sub-issues, any size L Sub-issue, or 1,000 or more changed lines gets [review-panel](skills/review-panel.md).
6. **Merge.** You merge the pull request to main; no skill does.
7. **Close.** [close-epic](skills/close-epic.md) writes the Epic's summary and retro comments, then records what it taught.

## 2. Single issue

1. **Triage.** [triage](skills/triage.md) gives the issue a triage role and, when it is ready to build, calls [harden](skills/harden.md) to write its Ticket contract and size it. A bug's reproduction becomes its Verify block, red on main until the fix lands.
2. **Build.** [build](skills/build.md) hands the issue to [building](skills/building.md), which runs one worker, which builds the One-off with [implement-issue](skills/implement-issue.md) (and [diagnosing-bugs](skills/diagnosing-bugs.md) for a bug, with the Verify block as its loop), then one [review](skills/review.md) gate.
3. **Merge.** You merge the pull request.

## 3. Unknown territory

If the idea is still too loose to chart, you can first explore it with [discuss](skills/discuss.md). The step is optional, and it is not a path of its own, because a discussion may end in nothing.

1. **Chart the map.** [wayfinder](skills/wayfinder.md) turns a loose idea into a map of decision tickets on GitHub Issues.
2. **Settle one decision per session.** Each ticket's label says how it settles: an interview with [grilling](skills/grilling.md), a cited note from [research](skills/research.md), a [prototype](skills/prototype.md), or one piece of manual work. Keep going until no decision stands between you and building.
3. **Join the Epic path.** Once the map has a destination, [to-spec](skills/to-spec.md) in that conversation writes the Epic, and path 1 continues from step 3.

## 4. Scans

1. **Scan.** [improve-architecture](skills/improve-architecture.md) surveys for deepening opportunities across the repo or in one pull request, and explores the one you pick, using the words of [codebase-design](skills/codebase-design.md). [test-audit](skills/test-audit.md) reads a suite for Pruning opportunities: tests another test already covers.
2. **File.** Each skill files what you accept as an issue.
3. **Build it on another path.** A filed issue small enough for one pull request takes path 2; a larger one takes path 1. A `test-audit` issue is always one test's removal, so it takes path 2.

## 5. Tiny unfiled work

No spp. Make the change in the session, with [tdd](skills/tdd.md) if you want it test-first and [pr](skills/pr.md) for the pull request body. A change that grows past one session goes back to path 1 or path 2.
