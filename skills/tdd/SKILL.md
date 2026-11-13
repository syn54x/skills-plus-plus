---
name: tdd
description: Test-driven development in thin red-green slices. Use when the user wants to build a feature or fix a bug test-first, or mentions red-green-refactor.
metadata:
  credits:
    - skill: tdd
      author: Matt Pocock
      url: "https://github.com/mattpocock/skills/tree/main/skills/engineering/tdd"
    - skill: test-audit
      author: Builder.io
      organisation: BuilderIO
      url: "https://github.com/BuilderIO/agent-native/tree/main/.agents/skills/test-audit"
    - skill: writing-good-tests
      author: Jesse Vincent
      url: "https://github.com/obra/superpowers/blob/main/skills/test-driven-development/writing-good-tests.md"
    - skill: test-audit
      author: Matthew Blode
      url: "https://github.com/mblode/agent-skills/tree/main/skills/test-audit"
    - skill: test-design-reviewer
      author: Paul Hammond
      url: "https://github.com/citypaul/.dotfiles/tree/main/claude/.claude/skills/test-design-reviewer"
---

Build behaviour one test at a time. Each cycle writes one failing test at an agreed seam, watches it go **red**, then writes the least code that turns it **green**. Tests made this way check what the code does for its callers, so they keep passing when its insides change.

## Agree the seams

A **seam**, here, is the interface a test drives: the place where behaviour shows without reaching inside. Call the Skill tool with "codebase-design" for the words (module, interface, seam, depth) and for its rule that a test is one more caller.

- **With an issue that carries the Ticket contract** (a Sub-issue or a One-off): its Test scenarios are the agreed seams and cases, so there is nothing to ask. Write one test per scenario line, in the order the lines are given, as written: the scenarios went through the Necessity check (below) when the issue was hardened, so do not run it on them again or decline one. A case you find along the way joins the scenario it belongs to and is listed in the pull request.
- **Without one**: put every test you would write through the Necessity check (below) first, including a test the person asked for by name. Then propose the seams that are left to the person, each with one line on what a test there would catch and what it would miss, and wait for their agreement. Only an agreed seam gets a test.

Done when every test you plan maps to an agreed seam.

## The Necessity check

This check applies where you propose the seams and cases yourself, with no Ticket contract; a Test scenario is written as given (above). There, a test earns its place only when it answers yes to three questions, asked before it is written and again whenever someone decides whether to keep it:

1. **Does it name a break?** Say in one line which change to the code would turn it red. A test with no such line guards nothing.
2. **Does no other test already catch that break?** A second test for the same break adds no evidence, and it is one more place to edit on every change.
3. **Does it fail only when behaviour a caller can see changes?** A test that also fails on a refactor that changes nothing for callers is implementation-coupled (below).

**One owner per behaviour.** A behaviour's cases belong to one interface: the highest one where all of them are cheap and deterministic to drive. Other layers get at most a wiring test, which shows the inner piece is reached, and never replay the cases. A lower test is justified only when one of these holds:

- the cases are many and costly to drive from outside;
- the state a case needs cannot be reached on demand through the outer interface;
- the inner module has several callers, so it is a seam with a contract of its own;
- the outer test would need a real network or a costly database.

**Already covered?** Find out with a deliberate break: break the inner code (invert the condition, return the input unchanged), run the outer tests, then undo the break. If an outer test fails, the lower test is redundant and that outer test is its **Keeper**: write nothing, and tell the person which test it is and that the break turned it red. If no outer test fails, the outer assertion is too loose, so sharpen it until the break turns it red before you consider a lower test. Where nothing can be run, read the outer test and the code it drives, name the **Keeper** from that reading, and say that the break was not run.

**Never test** a constant, the wording of a message, the behaviour of the framework or a library, or a trivial getter, constructor or forwarding function. Each one restates its own code, so it goes red only when someone edits that code on purpose. When asked for one without a Ticket contract, decline and say which of these it is.

Done when every test you plan has a named break, no **Keeper** already catching it, and none of the exclusions.

## The cycle

1. Write one test for the next behaviour. Name it for the behaviour, in the project's `GLOSSARY.md` terms when it has one ("an expired coupon leaves the total unchanged"), never for the mechanism.
2. Run it and watch it fail on the assertion about that behaviour. A failure from a typo, an import or a missing fixture is not red yet; fix the test and run again. A test that passes on its first run either restates behaviour that already exists or checks nothing; find out which before going on.
3. Write the least code that makes it pass. Leave the next test's behaviour for the next test.
4. Run it and the tests beside it: all green.

Make the opening cycle a **tracer bullet**: the thinnest path through every layer the behaviour crosses, so later cycles fill in a skeleton that already runs end to end.

Done when every planned case has gone red, then green, in order, and the whole test file passes.

## Expected values

An expected value comes from a source the code under test does not use: a number worked out by hand, an example in the spec or the issue, a value the person confirmed. When the expected value is computed by the same steps the code takes, replace it with the worked literal.

## Four anti-patterns

| Anti-pattern | How it shows | Write instead |
| --- | --- | --- |
| **Implementation-coupled** | The test mocks your own modules, calls private functions, counts calls, or checks a side channel (the database row) instead of the interface. A refactor that changes no behaviour breaks it. | Drive the interface, and observe the result through the interface as well. |
| **Tautological** | The expected value is derived the way the code derives it, so the test has no way to catch a mistake in it. | A literal from an independent source (above). |
| **Horizontal slicing** | Several tests written before any code, or the code written before its tests. Each test pins the shape you imagined before the first one ran. | Vertical slices: one test, one change, then the next. |
| **Redundant** | An inner test replays a case an outer test already owns: break the inner code and both go red. | Delete it and keep the outer test as its **Keeper**, or sharpen the outer assertion until the deliberate break turns it red. |

Doubles belong only at the edges of the system the project does not own: a network service, the clock, randomness, and, where a real one is costly, the filesystem or a database. When a test needs a double, when you are unsure where an expected value should come from, or when you are judging whether a test is redundant or junk, read [`TESTS.md`](TESTS.md): each anti-pattern beside its repair (`## Redundant` among them), the `## Junk patterns` an audit hunts for, and how to pass an edge in so a test can replace it.

## Done when

- Every Test scenario, or every agreed seam, has a test that was seen red before it went green.
- Every test written passed the **Necessity check**, when you proposed it yourself; a Test scenario's test is written as given.
- Every expected value has a source other than the code under test.
- Doubles stand in only for edges the project does not own.
