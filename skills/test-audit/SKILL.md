---
name: test-audit
description: Read a test suite or one area for tests another test already covers, and file the removals you pick as issues for triage.
disable-model-invocation: true
argument-hint: "[area]"
metadata:
  credits:
    - skill: test-audit
      author: Matthew Blode
      url: "https://github.com/mblode/agent-skills/tree/main/skills/test-audit"
    - skill: test-audit
      author: Builder.io
      organisation: BuilderIO
      url: "https://github.com/BuilderIO/agent-native/tree/main/.agents/skills/test-audit"
---

Read the tests in scope, find the ones another test already covers, and show them to the person as **Pruning opportunities**: a test to remove, its **Keeper**, and a Strength. Each one the person picks is filed as an issue for triage. The run reads code and tests and changes neither. It reports removals only: no skipped tests, no misplaced tests, no missing-test gaps. It works to no numeric target, so it reports every opportunity it finds, however many or few.

## 1. Choose the scope

Read the scope from what follows `/test-audit`:

| Argument | Scope |
| --- | --- |
| Nothing | Every test file in the repo |
| An area (a directory, a subsystem or a test folder) | The test files for that area |
| A pull request number or URL | None: there is no pull request scope |

A pull request number or URL gets one line saying the review panel's test Persona covers a pull request, and the run ends.

Done when you have told the person the scope in one line.

## 2. Load the words

Call the Skill tool with "tdd" and use its `## The Necessity check`, then follow its pointer to `TESTS.md` for `## Junk patterns`. The three questions, the Keeper and the junk patterns live there and are not restated here. Read the repo's `GLOSSARY.md` in plain prose terms, so opportunities use the project's nouns. When the file is missing, carry on without it.

## 3. Find the tests

List the test files in scope with the harness's file search, by the project's own test naming (the runner's config, or the convention the existing tests follow). Name no shell command for this, so the step works in a session with no shell.

Done when you have the list of test files, and its length.

## 4. Read with the Necessity check

Put the three questions to each test, using the junk patterns to spot candidates. For each candidate, look for its Keeper by reading: a test at the owning interface that drives the same case and asserts on a result the break would change.

A candidate becomes a Pruning opportunity only when a Keeper is named. A candidate with no Keeper is not an opportunity and is not reported, since no test is removed without a named Keeper. Never run the deliberate break and never claim the Keeper was proven: triage proves it later. Give each opportunity a Strength:

| Strength | When |
| --- | --- |
| `Strong` | The Keeper drives the same case through the owning interface and asserts on the result the break changes |
| `Worth exploring` | The Keeper reaches the owning code with that case, but its assertion may be too loose to notice the break |
| `Speculative` | The Keeper reaches the owning code with different inputs, so whether it catches the break is a guess |

Done when every test file in scope has an answer, every opportunity has its Keeper, owning code, break and Strength, and the files where nothing was found are listed. Finding none is a valid result: say so and end the run.

## 5. Report

Read [`FORMATS.md`](FORMATS.md) and produce `## The report` in the conversation, with every opportunity found. Then ask which opportunities to file; "none" ends the run.

## 6. File what was picked

One issue per picked opportunity. Each is one test's removal, so one pull request's worth. Write the body from `## The issue` in `FORMATS.md` to a file in the session's scratch directory, show it, and file it only after the person says yes to that issue:

```bash
gh label create needs-triage 2>/dev/null || true
gh issue create --title "Remove redundant test: <test name>" --body-file "<file>" --label needs-triage
```

Every filed issue carries `needs-triage`, never a ready label, so it always enters through `/triage <N>`. Tell the person that is the next step.

Done when every picked opportunity has an issue URL, or the person declined to file it.

## What the run may write

The body files in the scratch directory and the issues the person approved. Code and test files are only ever read, no comment is posted, and nothing is filed without its own yes.
