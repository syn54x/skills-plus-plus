---
name: harden
description: Make one GitHub issue buildable by writing its Ticket contract. Use when asked to harden an issue or make it ready to build, or when spp lint ticket fails on one.
metadata:
  credits:
    - skill: writing-plans
      author: Jesse Vincent
      url: "https://github.com/obra/superpowers/tree/main/skills/writing-plans"
---

Harden one issue. The worker who later builds it reads that issue and nothing else, so the body has to answer four questions the worker would otherwise ask: what am I making, which files are mine, what do my neighbours call things, and how do I know I am finished. Every answer is checked against the repository before it is written, since an answer taken from the plan is the one that turns out wrong mid-build.

The examples below follow one issue: adding a `--since <date>` flag to a CLI's `report` command.

## Inputs

- **The issue**, a number or URL. From to-tickets it is a fresh Sub-issue whose parent and blocked-by edges already exist; from triage it is the filed issue.
- **The intent**: the approved slice and its Epic, or for a One-off the issue's own text and what triage found.
- **A requested change**, on a repeat call: a narrowing the user approved, an Interface to correct, two slices folded into one.

Read `GLOSSARY.md` and the Laws line's documents first; the body speaks their terms. Leave the body's existing text in place (a report, `## Parent`, `## Blocked by`) and put the contract under it, overwriting any earlier draft of the same heading.

## What am I making

`## What to build` describes the change from where its user stands: "`report --since 2026-01-01` lists only entries on or after that date". Layers and file names belong elsewhere. If the caller hands you an approved narrowing, this section gains a `**Narrows:**` line, in the caller's words, stating which Epic behaviour is reduced and to what.

`## Acceptance criteria` is a checklist in which every box can be ticked by an observation, and none could be ticked on the base commit. A box that is true before work starts measures nothing. The one exception is a criterion marked as already covered (see the **Necessity check** below), which is true on the base commit by design: an existing test already holds it.

Then pick the size label, one only (or the field the Routing block's Sizes line names). Start from `size:M`. Raise it to `size:L` when the issue runs a migration, changes a contract other issues share, or edits callers in more than one package. Lower it to `size:S` when it fits a single session, touches three files or fewer, and does neither of those things. Remove any other `size:` label as you set it. Whether the issue is ready is the caller's call; harden never adds `ready-for-agent`.

## Which files are mine

`## Files owned` holds `Create:`, `Modify:` and `Test:` lines with paths in backticks, all in one repo (two repos means two issues). These paths are a lock: a **Wave** never runs two workers whose paths overlap, so a glob that locks a whole folder holds up everyone else who needs it. List files.

Three of the six code checks exist to finish this list, because each finds a file the worker would otherwise edit without owning it:

- **Output pins.** If the issue changes text a user sees, find every place that asserts the current text, anywhere in the tree: `git grep -F "Entries:"` from the repository root turns up CI steps, docs samples, snapshots, fixtures and expected-output files as well as tests. Each one that would fail on the new text is owned, as Modify or Test. One that only mentions the text in passing, like a changelog line, is not. No visible output changed means nothing to search.
- **Callers of changed signatures.** Changing what `buildReport(opts)` accepts makes every existing call site a Modify entry.
- **ADR placement.** For each Modify path, look up the ADRs and Laws documents covering that part of the tree. Some say where a kind of content has to live: in a reference file next to the one that links it, in a folder kept for it, or listed in an index. When one applies, own that file too, and say in What to build which part of the work lands where.

## What do my neighbours call things

`## Interfaces` has a `Consumes:` line and a `Produces:` line, each `none` when empty (as on most One-offs). Produces gives the exact name and shape another issue will code against, `parseSince(arg: string): Date`, and names that issue. Consumes names what this issue takes and the issue that makes it, and needs a blocked-by edge to that issue.

When the other issue lives in another repo, write it `owner/repo#N` and describe the contract rather than the code (route plus request and response shapes, event plus payload, client method), ending with an **Available when** clause: the moment the consumer can actually reach it, such as "deployed to preview from the integration branch". If a Produces line creates a module or reshapes one's interface, call the Skill tool with "codebase-design" before fixing its wording, so the pull request that ships it passes the Depth check.

## How do I know I am finished

`## Test scenarios` lists what the worker will turn into tests, one line each, in the form `<action> → <result>`, opening with `Happy path`, `Edge case`, `Error path` or `Integration` as fits:

- Happy path: run `report --since 2026-01-01` → two of the four sample entries print
- Error path: run `report --since yesterday` → exit 2 with `invalid date: yesterday`

The right side records an effect the left side caused. A control is something to use, never something to look at: "click Export → a CSV downloads" can only be tested by clicking, while "Export is enabled" can pass with nothing exported. If nothing behaves differently afterwards, the section is the one line `Test expectation: none, because <reason>`.

The **Necessity check** applies here. Call the Skill tool with "tdd" for the rule, under its heading `## The Necessity check`; it is not restated. Put each scenario the plan proposed through it, and one of three things happens:

| The scenario | What you write |
| --- | --- |
| An existing test already catches its break | No scenario line. Its criterion stays and ends ``(already covered by `file::name`)``, naming the **Keeper**. |
| It differs from other scenarios only by input | One table scenario: one line, one test, each input with its result in the same order. |
| It takes ownership of a behaviour an existing test covers at another layer | The line ends ``; replaces `file::name` ``, that test's file joins Files owned as a `Test:` entry, an acceptance criterion says ``` `file::name` no longer exists ```, and Verify gains the command [PRUNING.md](PRUNING.md) describes, which fails while that test's name is still in its file. |

`file` is the path from the repo root and `name` the test's name, the form the worker uses in the pull request's Ticket section. For `report --since`, a scenario that `test/report.test.ts::keeps entries on or after the date` already covers loses its line, and its criterion ends ``(already covered by `test/report.test.ts::keeps entries on or after the date`)``. Name the **Keeper** the way `tdd`'s deliberate-break check does, but you change no code in the working checkout, so make the break in a scratch copy. If the break was not run (no shell, or nothing can be run), the mark reads ``(already covered by `file::name`, break not run)``. When every scenario is dropped, the section is the one-line form, ``Test expectation: none, because `file::name` already covers it``, naming each **Keeper**. A replaced test needs no proof of its own, because its replacement is written test-first and seen red; the criterion is what makes the worker delete it. You name no removal other than a test one of the issue's own scenarios replaces; you do not sweep the issue's test files for others.

A pruning issue (its body holds `## Pruning opportunity`) is hardened by [PRUNING.md](PRUNING.md): read it before writing the contract.

The **scenario data exists** check applies here. Whatever a result asserts on, be it a property, a message, a piece of the screen or an error, has to exist in today's code, or be created by a Produces line on this issue or on a blocker. Where it is missing, either add that Produces line and the work to fill it, or rewrite the result against something real.

`## Verify` is one fenced block of commands to run from the repo root, and passing it is what done means; the worker runs it, and so does the reviewer after them. Each line is a command, never an instruction to inspect something. Tests are selected to this issue, by its Test paths or the test-selection tool the Laws name, because CI already runs everything on the pull request.

The **Verify resolves, and is green on the base branch where it can be** check applies here. The base is the branch the work will start from: the Epic's integration branch when it already exists, otherwise the branch build will cut it from (the default branch unless the Epic or the Routing block names another), and for a One-off, the default branch. Every tool must be on the machine or named in the repo's own tooling (the CI workflow, a Makefile, `pyproject.toml`, package scripts), and every subcommand must answer `--help`. Next, on a fresh checkout of the base branch, run each command that does not wait on this issue's code, such as a lint, a typecheck or an existing test path. Any that fail there would greet the worker with a red it did not cause, so fix the block now. Commands for tests the issue will add fail today by design; for those, resolving is enough.

## Nothing left to ask

Read the six sections as the worker would, and remove every spot where they would have to come back with a question. `spp lint ticket` catches the literal markers: `TBD`, `TODO`, a lone `?`, "add appropriate ...", "similar to #N", a missing or empty section, a scenario without its category or arrow, and a size count other than one. You catch what a script cannot: a criterion with no way to observe it, a promise of tests with no scenarios, a Consumes name no issue produces.

## Write, lint, or route

Write the body to a file unique to this issue, apply it with `gh issue edit <N> --body-file <file>`, and run `spp lint ticket <N> --pin <file>` with that same file. Each line of its output names a rule and the failure; fix, write, and run again until it prints `ok`. That last run also pins the Verify block you wrote: the hash of the file's block goes into the progress comment, and `spp verify` refuses to run a block that differs from it, because anyone who can edit the issue can rewrite the commands a worker will run. The pin comes from your file, never from the issue, so an edit someone makes after your write fails the lint with `pin-match` instead of being approved. So this run is always the last step, after the final edit to the body.

Some gaps need a person: an output nobody has decided, a base-branch failure this issue cannot fix, an Interface the Epic leaves open, a placement no law settles. For those, `gh issue edit <N> --add-label needs-info --remove-label ready-for-agent`, then one comment titled **Still open** with a bullet per gap naming the section it holds up.

## Done when

You tell the caller the size and one of two outcomes:

- `spp lint ticket <N> --pin <file>` printed `ok` on the body as it now stands, and all six code checks and the read for open questions found nothing.
- The issue carries `needs-info` and one comment listing every gap that remains.
