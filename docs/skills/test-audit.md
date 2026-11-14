## What it does

`test-audit` reads a test suite, or one area of it, and reports **Pruning opportunities**: tests that another test already covers. Each one names the test to remove, the **Keeper** that still catches the same break, the code the Keeper guards, and a Strength.

It names each Keeper by reading and removes nothing itself. It changes no test or code file, runs no deliberate break, and works to no numeric target. You pick the opportunities worth filing, and each one becomes an issue awaiting triage, filed only after your yes to that issue.

## When to reach for it

You type `/test-audit`, or `/test-audit src/billing` for one area; the agent never starts it on its own. Reach for it when a suite has grown tests that add no evidence: the same case checked once through the public interface and again in a function it calls.

| Your situation | Use |
| --- | --- |
| You want a pull request's tests judged | The [review-panel](review-panel.md) test Persona |
| You are writing a new test | [tdd](tdd.md), which asks the same three questions before the test exists |
| A suite carries tests that add no evidence | `/test-audit` |

It sits on the scans path, the fourth of spp's five [paths](../paths.md): each issue it files enters path 2. The [ask-spp](ask-spp.md) router covers every skill when the right one is unclear.

## Keeper and Strength

A **Keeper** is the test that stays. It drives the same case through the interface callers use and asserts on a result that the removed test's break would change, so removing the other test loses no evidence.

The skill names the Keeper from reading, and says so. Triage proves it later, by breaking the code and checking the Keeper goes red. The Strength says how far reading got:

| Strength | Means |
| --- | --- |
| `Strong` | The Keeper drives the same case through the owning interface and asserts on the result the break changes |
| `Worth exploring` | The Keeper reaches the code with that case, but its assertion may be too loose to notice the break |
| `Speculative` | The Keeper reaches the code with different inputs, so whether it catches the break is a guess |

A test with no Keeper is not reported at all.

## It's working if

- No file in your checkout changed.
- Every opportunity names a Keeper.
- No issue was filed without your yes to that issue.
- Every filed issue carries `needs-triage`, so it enters through `/triage <N>`.
