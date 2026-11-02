## What it does

`harden` writes the Ticket contract into one GitHub issue: What to build, Acceptance criteria, Files owned, Interfaces, Test scenarios, a Verify block, and one size label. Once it is done, a worker who sees only that issue can build it without asking anyone a question.

It reads the code before it writes. Each section is checked against the repository, not against the plan that produced it: the data a scenario asserts on has to exist, every test or fixture that pins the output the issue changes has to be in Files owned, and every Verify command has to run, and pass on the default branch where it can. Then `spp lint ticket` gates the result mechanically. The skill finishes in one of two states: the lint prints `ok`, or the issue is labelled `needs-info` with a comment listing what a person still has to decide.

## When to reach for it

Type `/harden <N>`, or the agent starts it when a task fits. Mostly it runs underneath other skills: [to-tickets](to-tickets.md) calls it once per Sub-issue of an Epic, and triage calls it once to turn a filed bug or enhancement into a One-off that `/build` can take. Start it yourself when `spp lint ticket` fails on an issue, or when you have written an issue by hand and want it buildable.

| Your situation | Use |
| --- | --- |
| An Epic needs splitting into Sub-issues | `/to-tickets`, which calls `harden` for each one |
| A bug or enhancement was filed by someone | triage, which reproduces or verifies it first |
| One issue needs its contract written or repaired | `/harden <N>` |

`ask-spp` routes between every skill when the right one is unclear.

## The five code checks

Each check is answered from the repository, because every one of them has sent a worker outside its Files owned or into rewriting its own Verify block when skipped.

| Check | Passes when |
| --- | --- |
| Scenario data exists | every value a scenario asserts on exists today, or a Produces line creates it |
| Output pins | every file in the tree that asserts the output being changed is in Files owned |
| Callers of changed signatures | every caller of a changed signature is in Files owned as Modify |
| Verify resolves | every command resolves, and those not waiting on new code pass on the default branch |
| ADR placement | content goes where the repo's ADRs and Laws say that kind of content lives |

## Common questions

**A worker had to add a field nobody asked for.**
The scenario asserted on data the code did not expose, such as a value only an internal record held. The scenario-data check now finds that before publishing, and either makes the field part of the issue's work or points the scenario at data the code already has.

**The Verify block could not run as written.**
Earlier contracts named a test runner the repo cannot link, a docs tool foreign to the repo, or a lint already failing on main. Every command now has to resolve, and the ones that do not depend on the issue's new code have to pass on the default branch first. A command for tests the issue has yet to write fails until the work lands, and that is expected.

**The worker missed a fixture that pinned the old output.**
An earlier search looked only in the folder being changed, and the pins sat in fixtures at the repository root. The output-pins search now covers the whole tree, including fixtures, snapshots, CI steps and docs examples.

**Why does Verify not run the whole test suite?**
The worker runs Verify, the reviewer runs it again, and so does every fix round. A full suite in each of those runs left agents waiting on tests unrelated to the change. Verify names the issue's own test paths, and CI runs the full suite on the pull request.

**Why must a scenario press the button rather than check it is enabled?**
A test written from "Save is enabled" can pass without anything being saved. Each scenario is written `<action> → <result>`; its right-hand side has to be an effect of the action, so the test derived from it has to use the control.

## It's working if

- `spp lint ticket <N>` prints `ok` on the issue, or the issue carries `needs-info` with a comment naming each open gap.
- Workers do not report a Verify block they had to correct.
- No pull request edits a file outside its Files owned to get a test or a caller passing.
- Every Test scenario line reads as something done and what it caused.
