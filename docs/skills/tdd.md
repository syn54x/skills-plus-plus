## What it does

`tdd` grows code one test at a time, for new behaviour and bug fixes alike. Each test is written first and seen failing (**red**), then the least code that makes it pass is written (**green**), and the next test waits until that one passes. It also carries the rules that make those tests worth keeping: where expected values come from, where test doubles are allowed, and four habits that turn a suite into noise.

When it proposes a test itself, with no issue behind it, `tdd` first runs the **Necessity check**: does the test name a break, does no other test already catch that break, and does it fail only when behaviour a caller can see changes. When an existing test already catches the break, `tdd` declines and names that test as the **Keeper**. It also refuses tests of a constant, of message wording, of framework behaviour, and of a trivial getter, constructor or forwarding function.

No test gets written at a seam nobody agreed to. On a Sub-issue or a One-off the agreement already exists, because the issue's Test scenarios name the seams and the cases, and `tdd` writes one test per scenario line in the order given. With no such issue, it proposes the seams first, says what a test at each one would catch and miss, and waits for you.

## When to reach for it

Type `/tdd`, or the agent starts it when a task fits: new behaviour or a bug fix to drive with tests written first, or turning an issue's Test scenarios into tests. On the Epic path and the single-issue path, implement-issue calls it for every Sub-issue or One-off it builds, so most of its runs happen inside a worker.

| Your situation | Use |
| --- | --- |
| A behaviour with a clear input and an observable output, to build test-first | `tdd` |
| Something is broken and nobody knows why yet | [diagnosing-bugs](diagnosing-bugs.md), which finds the cause and then writes the regression test the same way |
| The question is where the interface should be, not what to test through it | [codebase-design](codebase-design.md) |

`ask-spp` routes between every skill when the right one is unclear.

## Red, green, one slice at a time

The loop has four moves: write one test named for a behaviour, watch it fail on that behaviour's assertion, write the least code that passes it, and run the neighbouring tests green. A failure caused by a typo or a missing import does not count as red, and a test that passes on its first run is suspect until you know why.

The opening cycle is a **tracer bullet**: the thinnest path through every layer the behaviour crosses. Every later cycle fills in a skeleton that already runs.

The four habits the skill is written against:

| Habit | The tell |
| --- | --- |
| Implementation-coupled | Renaming a private function breaks the test though behaviour did not change. |
| Tautological | The expected value repeats the code's own arithmetic, so the two cannot disagree. |
| Horizontal slicing | Many tests land before any code, or the code lands before any test. |
| Redundant | An inner test replays a case an outer test already covers, so breaking the inner code turns both red. |

## One owner per behaviour

Each behaviour gets its tests at one interface: the highest one where all its cases are cheap and deterministic to drive. A lower layer gets at most one test that it is wired in, and never the same cases again. A lower test is still worth writing when the cases are many and costly to drive from outside, when the state cannot be reached on demand from outside, when the inner module has several callers of its own, or when the outer test would need a real network or a costly database.

To tell whether a case is already covered, `tdd` breaks the inner code on purpose and watches whether an outer test fails. If one does, that test is the **Keeper** and the inner test is not written. If none does, the outer test's assertion is sharpened first.

Expected values come from somewhere the code does not: a number worked out by hand, an example in the spec, a value you confirmed. Test doubles stand in only for things the project does not own, such as a remote service or the clock.

## Common questions

**It asked me to pick a test seam and I could not tell the options apart.**
Each proposed seam now comes with what a test there would catch and what it would miss, so you choose between trade-offs rather than labels. On a Sub-issue or a One-off it does not ask at all, because the Test scenarios were agreed when the issue was written.

**Where is the refactor step?**
There is none inside the cycle. Restructuring belongs to review, which reads the finished change with fresh eyes once every test is green.

**It wrote the code before the test.**
An agent sometimes falls back on habit even with the rule in front of it. The red run is the evidence to look for: a worker's pull request names the command it saw fail before the change and pass after it. If that line is missing, the loop was not followed.

**Should the first test be a browser or end-to-end test?**
Rarely. A slow test stretches every cycle, and a test that cannot pass yet is easy to mistake for a broken test. Start at the fastest seam that shows the behaviour, and add the browser test once the behaviour works.

## It's working if

- The test for each behaviour exists, and was seen failing, before the code that satisfies it.
- Test names read as behaviours ("a 3 kg parcel costs 9.50 to ship"), not as calls between internals.
- Every expected value has a source you can point to in the spec or the issue.
- Renaming an internal function breaks no test.
- Doubles appear only around services and clocks the project does not own.
- No behaviour is tested at two layers with the same cases.
