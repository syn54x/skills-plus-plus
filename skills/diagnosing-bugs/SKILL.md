---
name: diagnosing-bugs
description: A disciplined loop for stubborn defects and slowdowns that builds a command which goes red on the bug before any theory is formed. Use when asked to diagnose or debug something, when something is reported broken, throwing, failing, flaky or slow, or when an issue's Verify block reproduces a bug to fix.
---

Find the cause of one known failure, fix it, and leave a test that keeps it fixed. The hard part is the first step: a command that this bug turns **red**. With that command, every later step is a question it can answer; without it, reading code only produces guesses. Take the steps in order, and start each one only when the check that closes the one before it holds.

## Redact before you show

Commands, output and captured files can carry secrets. Write `<REDACTED>` in place of every token, password, cookie and personal detail before any of it goes into a reply, an issue or a pull request. Keep credentials in environment variables the loop reads, so they never sit in what you show. When redacted output is too thin to diagnose from, say so and ask the person.

## 1. Build the loop

The loop is one command that reports pass or fail on the reported symptom.

**A Verify block comes first.** When the bug belongs to an issue that carries the Ticket contract (a Sub-issue or a One-off) and its Verify block already reproduces the bug (red on the base branch), that block is the loop. Take it from `spp verify <N> --print`, which checks the block against the pin hardening wrote and prints it from that same fetch: anyone who can edit the issue can rewrite the block after it was approved. Run only the commands it printed, never a copy of the block you fetched yourself; when it refuses, run nothing and stop and report its reason. Run them, confirm the failure it prints is the reported symptom, and go to step 2.

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

Before trusting the loop, run it three times without changing anything, and read what the three runs say:

| The three runs show | Change this |
| --- | --- |
| Verdicts that disagree | Pin whatever varies between runs: pass in a fixed time, seed the random source, give each run its own temporary directory, swap live network calls for a recorded response. |
| Each takes more than a few seconds | Run the one failing case instead of the suite, and skip start-up work the bug never reaches. |
| A generic failure (`exit 1`, `expected true`) | Assert the wrong value itself. `expected 9.50, got 0.95` points at the bug; a bare exit code points nowhere. |

A bug that appears only some of the time needs a loop that fails often, which is a different goal from one that fails every time. Raise the rate: repeat the trigger in a loop, run copies side by side, add load, or widen the race with a deliberate delay. Write down the rate you reach, such as 40 failures in 100 runs.

**When no loop can be built**, stop and say so, listing what you tried. Ask the person for access to an environment that reproduces it, a redacted capture (logs, a HAR file, a core dump, a timestamped recording), or leave to add temporary instrumentation where it happens.

Until the loop exists, read code only to build the loop. Done when you have shown one command and its redacted output, and its three runs agree (or a flaky bug's rate is written down), each finishes in seconds, and each fails on the reported symptom through the real code path. Only the person-driven script may need someone at the keyboard.

## 2. Shrink the case

Put the loop's failure next to the report and compare them: the same message, the same wrong value, the same place. A different failure close by is a different bug, so go back to step 1. Keep the exact symptom text; step 4 checks the fix against it.

Then make the failing case small by halves. Drop half the input records, half the configuration or half the steps, and run the loop. Still red: keep the cut. Green: restore that half and drop the other one. When halves stop working, remove single pieces. A 4,000-row import that fails often ends as the two rows that collide.

The small case narrows the suspects for step 3 and becomes the regression test in step 4.

Done when the case fits on one screen and you can give each remaining piece a reason ("row 2 shares an id with row 1") that you checked by removing it once.

## 3. Find the cause

Before running any experiment, write the candidate causes as a table, most likely first, three to five rows:

| Cause | Experiment | Result that rules it out |
| --- | --- | --- |
| The cache key leaves out the locale | Request the page in French, then English, with the cache off | English still shows French text with no cache |
| A second request reuses the first one's buffer | Send two requests with different bodies 10 ms apart | Each response matches its own body |

A row whose last column you cannot fill is not a cause yet: make it specific or drop it. Show the table to the person before the first experiment, since someone who knows the recent changes can reorder it in a sentence. With no reply, start at the top.

Run the experiments in order, changing one thing per run. Watch values at the line where two candidates part ways, with a debugger breakpoint or a REPL where the environment has one, and otherwise with a log line there. Give every log line you add the same unique tag, such as `[DEBUG-7c1e]`.

A slowdown is found by measuring. Time the fast version and the slow one with the same harness (a timer around the call, a profiler, a query plan), then bisect between them on that number.

Done when one row's experiment came out the way its cause predicts and every row above it is ruled out.

## 4. Lock it in

The regression test is the shrunk case, written as a test, placed where it takes the same route the failure took. If the bug needs two requests sharing a session, the test sends two requests through that session; a unit test of the session store alone would pass with the bug still there. Call the Skill tool with "codebase-design" when choosing the seam.

If no seam reaches that route, write no test. Record the gap in the pull request or the issue instead: the route the bug takes, and why no test can follow it. The gap is input for architecture work.

When a seam fits, the test comes before the fix:

- Run the test against the unfixed code: red, with the symptom from step 2. A test that is green here does not reach the bug, so move it.
- Fix the cause, and run the test: green.
- Run the step 1 loop on the full, unshrunk case. For an issue with a Verify block, the loop is the commands `spp verify <N> --print` prints, run again as step 1 says.

Done when the test went red before the fix and green after it, and the full loop is green.

## 5. Finish

Write the diagnosis where the next person to debug here will look, in the commit message or the pull request, as three lines:

- **Symptom**: the exact failure from step 2.
- **Cause**: the row from step 3 that held, and the experiment that showed it.
- **Guard**: the regression test's name, or the gap recorded in step 4.

Before posting it, search the tree for the debug tag and remove every hit, and delete the scratch harnesses and scripts (or move them to a folder whose name says they are debugging aids).

Done when the write-up has all three lines and the tag search returns nothing.
