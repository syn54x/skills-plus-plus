## What it does

`diagnosing-bugs` finds the cause of one known failure, fixes it, and leaves a regression test behind. It works in five steps: build a loop, shrink the case, find the cause, lock the fix in with a test, and write up what it found.

It forms no theory until it has a command that goes red on the bug. Left alone, an agent given a bug report goes straight to reading code and forming guesses; this skill makes it first produce one command, run at least once with its output shown, that fails on the symptom you reported. When the bug is a Sub-issue or a One-off whose Verify block already reproduces it, that Verify block is the command, and the skill starts from it.

## When to reach for it

Type `/diagnosing-bugs`, or the agent starts it when a task fits: you ask it to diagnose or debug something, something is reported broken, throwing, flaky or slow, or an issue's Verify block reproduces a bug to fix. On the single-issue path, triage hardens a bug into a One-off whose Verify block is the reproduction, red on main, and the worker that builds the fix uses this skill with that block as its loop.

| Your situation | Use |
| --- | --- |
| A failure with a symptom you can name, cause unknown | `diagnosing-bugs` |
| Something got slower, and you know a fast version and a slow one | `diagnosing-bugs`, which measures a baseline and bisects instead of logging |
| A behaviour to build, with nothing broken | [tdd](tdd.md) |
| "Where are the slow parts of this codebase?", with no specific symptom | Neither: this skill chases one known failure and does not survey |

`ask-spp` routes between every skill when the right one is unclear.

## The loop comes first

Everything after the first step is mechanical once a good loop exists, so most of the effort goes there. The skill tries the cheapest loop that reaches the bug: a failing test, a script against the running service, a headless browser script, a replayed capture, a throwaway harness, generated inputs, a bisect script, a diff between old and new versions, and last, a script that walks a person through the steps and reads back their answers.

Before trusting a loop, the agent runs it three times unchanged. The three verdicts must agree, each run must take seconds, and the failure must name the symptom itself (`expected 9.50, got 0.95`) rather than a bare exit code. A flaky bug gets a written-down failure rate in place of agreement. A loop that passes those three runs is **tight**, and the agent can run it without you.

If no loop can be built, the agent stops, tells you what it tried, and asks for access, a capture or leave to add instrumentation, rather than guessing.

## Common questions

**I asked a quick question and it started a full diagnosis.**
It is model-invoked, so a description of something broken can start it. If you only want an answer, say so ("answer directly, no diagnosis") and it will not build a loop.

**Will the output it shows leak secrets?**
It redacts before showing anything: tokens, passwords, cookies and personal details become `<REDACTED>` in replies, issues and pull requests, and credentials stay in environment variables the loop reads. If the redacted output is too thin to work from, it asks you rather than showing more.

**Does it check with me before fixing?**
Once: before its first experiment it shows you a table of candidate causes, most likely first, each with the result that would rule it out. You may know of a recent change that reorders the table. If you do not reply, it carries on with its own ranking.

**Triage already reproduced this bug. Does it start over?**
No. Triage writes the reproduction into the One-off as its Verify block, and this skill takes that block as its loop, confirms it fails on the reported symptom, and moves on to shrinking it.

**Why did it refuse to write a regression test?**
A regression test only helps at a seam where it triggers the bug the way real callers do. When the only seam available is shallower, a test there would pass while the bug survives, so the skill records the missing seam as a finding instead. That finding is input for improve-architecture.

## It's working if

- Before it offers any theory, you see the command it will judge by, failing.
- It tells you when the failure it got differs from the one you reported, instead of carrying on.
- The case it ends up debugging is small enough to read in full.
- The commit or pull request carries three lines: the symptom, the cause and the evidence for it, and the test that now guards it (or the seam that is missing).
- A search for its debug tag (such as `[DEBUG-7c1e]`) comes back empty when it says it is done.
