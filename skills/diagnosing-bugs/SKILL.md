---
name: diagnosing-bugs
description: A disciplined loop for hard bugs and performance regressions that builds a command which goes red on the bug before any theory is formed. Use when asked to diagnose or debug something, when something is reported broken, throwing, failing, flaky or slow, or when a Sub-issue's Verify block reproduces a bug to fix.
---

Find the cause of one known failure, fix it, and leave a test that keeps it fixed. The hard part is the first step: a command that goes **red** on this bug. With that command, every later step is a question it can answer; without it, reading code only produces guesses. Take the steps in order, and start each one only when the check that closes the one before it holds.

## Redact before you show

Commands, output and captured files can carry secrets. Write `<REDACTED>` in place of every token, password, cookie and personal detail before any of it goes into a reply, an issue or a pull request. Keep credentials in environment variables the loop reads, so they never sit in what you show. When redacted output is too thin to diagnose from, say so and ask the person.

## 1. Build the loop

The loop is one command that reports pass or fail on the reported symptom.

**A Verify block comes first.** When the bug belongs to a Sub-issue whose Verify block already reproduces it (red on the base branch), that block is the loop. Run it, confirm the failure it prints is the reported symptom, and go to step 2.

Otherwise build one, trying the cheapest that reaches the bug first:

- a failing test at the seam nearest the bug;
- a script that calls the running service (an HTTP request, a command-line run on a fixture) and compares the output with a known good one;
- a headless browser script that asserts on the page, its console or its network traffic;
- a saved real input (request, payload, event log) replayed through the code path on its own;
- a throwaway harness that boots only the part of the system involved;
- many generated inputs, for output that is only sometimes wrong;
- a script that judges one revision good or bad, handed to `git bisect run`, when the bug arrived between two known states;
- the same input run through the old and the new version, with the outputs diffed;
- last, when a person has to act (click, sign in, read a screen): a script that prints one instruction at a time and reads back what they saw, so their answers return in a form you can parse. Signing in stays their step; the script never asks for a credential.

Then make it **tight**:

- faster: drop setup the bug does not need, and narrow to the one test;
- sharper: assert the exact symptom (the message, the wrong value, the timing), never only "did not crash";
- deterministic: fix the clock, seed randomness, isolate the filesystem and the network.

**A flaky bug** needs a higher failure rate more than a clean repro. Run the trigger many times, in parallel, under load, with timing windows narrowed or delays injected, until it fails often enough to test against.

**When no loop can be built**, stop and say so, listing what you tried. Ask the person for access to an environment that reproduces it, a redacted capture (logs, a HAR file, a core dump, a timestamped recording), or leave to add temporary instrumentation where it happens.

Until the loop exists, read code only to build the loop. Done when you can name one command, already run, with its redacted output shown, that is:

- [ ] **red-capable**: it drives the real code path and fails on the reported symptom;
- [ ] **deterministic**: the same verdict every run, or for a flaky bug a stated, high failure rate;
- [ ] **fast**: seconds, not minutes;
- [ ] **unattended**: you can run it alone, the person-driven script aside.

## 2. Reproduce and shrink

Run the loop and confirm three things:

- the failure is the one the person reported, not a neighbour of it;
- it repeats across runs, or at the stated rate;
- the exact symptom is recorded, so the fix can be checked against it.

Then shrink the case. Remove one input, caller, setting, record or step at a time, run the loop after each removal, and keep only what the failure needs. A smaller case leaves fewer suspects and becomes the regression test.

Done when removing any remaining piece turns the loop green.

## 3. Rank hypotheses

Write three to five candidate causes, ranked, before testing any of them. Each states a prediction that could prove it wrong: "If X is the cause, changing Y makes the failure vanish (or changing Z makes it worse)." A candidate with no such prediction is sharpened or dropped.

Show the ranked list to the person before testing. They may know of a recent change, or of a cause already ruled out. If they do not answer, continue with your ranking.

Done when the list is shown and every entry carries its prediction.

## 4. Instrument

Test the top hypothesis through its prediction, changing one thing at a time.

- Use a debugger or a REPL breakpoint where the environment offers one.
- Otherwise log only at the boundaries that separate one hypothesis from another.
- Tag every debug line with one unique prefix, such as `[DEBUG-7c1e]`, so a single search finds them all at cleanup.

For a performance regression, measure before changing anything: record a baseline with a timer, a profiler or a query plan, then bisect between the fast state and the slow one. Logs seldom show where the time goes.

Done when one hypothesis's prediction held and the others are refuted or ranked below it.

## 5. Regression test, then fix

A regression test needs a **correct seam**: one where the test triggers the bug the way real callers do. When the only seam available is shallower than that (one caller where the bug needs two, a unit that cannot rebuild the chain that failed), a test there passes while the bug survives. Then the missing seam is the finding: record it in the pull request or the issue, so architecture work can pick it up. Call the Skill tool with "codebase-design" for the words to describe it.

With a correct seam:

1. Turn the shrunk case into a test at that seam and watch it fail. If you forced the failure by editing code or a fixture, diff against an untouched copy to prove the edit took.
2. Fix the cause.
3. Watch the test pass.
4. Run the step 1 loop again on the original, unshrunk case (for a Sub-issue, its Verify block).

Done when the new test passes and the original loop is green.

## 6. Clean up

- [ ] The original loop is green.
- [ ] The regression test passes, or the missing seam is recorded.
- [ ] A search for the debug prefix finds nothing.
- [ ] Throwaway harnesses and scripts are deleted, or kept in a folder plainly marked as debugging aids.
- [ ] The commit or the pull request names the hypothesis that proved right, so the next person debugging here starts from it.
