---
name: tdd
description: Test-driven development in thin vertical slices, each test seen red before any code turns it green, at seams agreed before the first test is written. Use when building a feature or fixing a bug test-first, when a Sub-issue's Test scenarios are to become tests, or when asked for red-green or test-first work.
---

Build behaviour one test at a time. Each cycle writes one failing test at an agreed seam, watches it go **red**, then writes the least code that turns it **green**. Tests made this way check what the code does for its callers, so they keep passing when its insides change.

## Agree the seams

A **seam**, here, is the interface a test drives: the place where behaviour shows without reaching inside. Call the Skill tool with "codebase-design" for the words (module, interface, seam, depth) and for its rule that a test is one more caller.

- **With a Sub-issue**: its Test scenarios are the agreed seams and cases. Write one test per scenario line, in the order the lines are given. A case you find along the way joins the scenario it belongs to and is listed in the pull request.
- **Without one**: before the first test, propose the seams to the person, each with one line on what a test there would catch and what it would miss, and wait for their agreement. Only an agreed seam gets a test.

Done when every test you plan maps to an agreed seam.

## The cycle

1. Write one test for the next behaviour. Name it for the behaviour, in the project's `GLOSSARY.md` terms when it has one ("an expired coupon leaves the total unchanged"), never for the mechanism.
2. Run it and watch it fail on the assertion about that behaviour. A failure from a typo, an import or a missing fixture is not red yet; fix the test and run again. A test that passes on its first run either restates behaviour that already exists or checks nothing; find out which before going on.
3. Write the least code that makes it pass. Leave the next test's behaviour for the next test.
4. Run it and the tests beside it: all green.
5. Tidy only while everything is green, and run the tests again after.

The first cycle is a **tracer bullet**: the thinnest path through every layer the behaviour crosses, so later cycles fill in a skeleton that already runs end to end.

Done when every planned case has gone red, then green, in order, and the whole test file passes.

## Expected values

An expected value comes from a source the code under test does not use: a number worked out by hand, an example in the spec or the Sub-issue, a value the person confirmed. When the expected value is computed by the same steps the code takes, replace it with the worked literal.

## Three anti-patterns

| Anti-pattern | How it shows | Write instead |
| --- | --- | --- |
| **Implementation-coupled** | The test mocks your own modules, calls private functions, counts calls, or checks a side channel (the database row) instead of the interface. A refactor that changes no behaviour breaks it. | Drive the interface, and observe the result through the interface as well. |
| **Tautological** | The expected value is derived the way the code derives it, so the test can never disagree with the code. | A literal from an independent source (above). |
| **Horizontal slicing** | Several tests written before any code, or the code written before its tests. Each test pins the shape you imagined before the first one ran. | Vertical slices: one test, one change, then the next. |

Doubles belong only at the edges of the system the project does not own: a network service, the clock, randomness, and sometimes the filesystem or the database. When a test needs a double, or you are unsure where an expected value should come from, read [`TESTS.md`](TESTS.md): each anti-pattern beside its repair, and how to pass an edge in so a test can replace it.

## Done when

- Every Test scenario, or every agreed seam, has a test that was seen red before it went green.
- Every expected value has a source other than the code under test.
- Doubles stand in only for edges the project does not own.
