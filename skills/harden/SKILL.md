---
name: harden
description: Write the Ticket contract into one GitHub issue from the code it touches, then gate it with spp lint ticket. Use when to-tickets hands over an approved slice, when triage readies a bug or enhancement for /build, or when spp lint ticket fails on an issue.
---

Harden one issue: write the **Ticket contract** into its body, so that a worker who reads nothing else can build it. Read the code before writing any section. A contract drafted from the plan alone sends its worker outside Files owned, or has it quietly rewrite its own Verify block.

## Inputs

- **The issue**, as a number or URL. When to-tickets calls, the Sub-issue already exists with its parent and blocked-by edges. When triage calls, it is the reported issue.
- **What it must deliver**: the approved slice and its Epic, or for a One-off the issue's own text and triage's findings.
- **A change to make**, on a later call: an approved narrowing, a corrected Interface, two slices merged into one.

Before drafting, read `GLOSSARY.md` and every document on the Routing block's Laws line. The sections use the glossary's terms.

## 1. Draft the six sections and the size

Keep what the body already holds (the reporter's text, `## Parent`, `## Blocked by`). Write the six sections beneath it in this order, replacing any earlier draft under the same heading.

**What to build.** The behaviour this issue makes work, as its user would see it; a list of layers is not a behaviour. When the caller passes an approved narrowing, this section also holds a `**Narrows:**` line: the Epic's behaviour, then what this issue delivers in its place, in the words the caller gave.

**Acceptance criteria.** Checkboxes. Each criterion says how it is checked, and each is false on the base commit, since a criterion that already holds before any work grades nothing.

**Files owned.** Lines starting `Create:`, `Modify:` or `Test:`, with paths in backticks. A path here is a claim: it is how two workers in one **Wave** stay out of each other's files. Name files rather than globs, because a glob claims more and shrinks the Wave. All paths sit in one repo; work in two repos is two issues.

**Interfaces.** Two kinds of line, `none` where there is nothing (a One-off is usually `none` on both):

- `Consumes:` what this issue takes from another, naming the producing issue. Each one needs a blocked-by edge to that producer.
- `Produces:` the exact names, signatures, events or routes that another issue builds against, naming the consumer.

Across repos, write the producer as `owner/repo#N`, state the contract instead of code (a route with its request and response shapes, an event with its payload, a generated client method), and close the line with an **Available when** clause naming the moment the consumer can reach it, such as "merged to the integration branch and deployed to preview". When a Produces line adds a module or changes a module's interface, call the Skill tool with "codebase-design" and shape the line so the Depth check passes on the pull request that ships it.

**Test scenarios.** One line each, opening with `Happy path`, `Edge case`, `Error path` or `Integration` and written `<action> → <result>`. The result is something the action produced: the request sent with its payload, a value written to storage, a change on screen. A control named in a result is operated in the action, so a test derived from the line has to press it: "press Save → the draft is stored with today's date", never "Save is enabled". Use only the categories that apply. An issue with no behavioural change carries the single line `Test expectation: none, because <reason>`.

**Verify.** One fenced block of commands, run from the repo root. Passing means finished. The worker runs the block before opening a pull request, and the reviewer repeats it. Every line is a command, never a request to look at something by hand. The test command is limited to the issue's Test paths, or to the selection tool the Laws name, and never runs the whole suite, which is CI's job on the pull request.

**Size.** Exactly one label (or the field the Routing block's Sizes line names):

| Size | Fits |
| --- | --- |
| `size:S` | a single session's context, at most three files, no schema or shared contract change |
| `size:M` | one worker in one worktree, with sections that need careful reading |
| `size:L` | cross-cutting: migrations, shared contracts, or callers across packages |

Readiness belongs to the caller: harden sets the size and never adds `ready-for-agent`.

## 2. Check the draft against the code

Five checks, each answered by reading the repository rather than the issue. Fix every failure in the draft before the next step.

1. **Scenario data exists.** Every value a scenario asserts on (a property, an emitted event, a piece of the screen) exists today on the type or output it names, or a Produces line of this issue or of one of its blockers creates it. Every Error path names an error the code raises now or this issue's Produces adds. Otherwise give this issue the Produces line and the work behind it, or point the scenario at data that is already there.
2. **Output pins.** When the issue changes output a user sees (a printed line, a heading, an error message), search the whole tree from the repository root for the exact current string (`git grep -F "<string>"`). Pins hide in fixtures, expected-output files, snapshots, CI steps and docs examples as well as tests. Each hit that asserts the string is added to Files owned, under Modify or Test. A hit quoting it as history, such as a changelog entry, is left alone. An issue that changes no output skips this check.
3. **Callers of changed signatures.** When the issue changes an existing signature, every caller is listed under Modify.
4. **Verify resolves, and is green on the base branch where it can be.** Each tool exists on the machine or in the repo's toolchain (package scripts, `pyproject.toml`, a Makefile, the CI workflow), and each subcommand answers `--help`. Run every command independent of this issue's new code (a lint, a typecheck, a build, a test path that exists) on an up-to-date checkout of the default branch. It must pass there, or the worker inherits a failure it cannot fix. A command for tests this issue adds is expected to fail today, so only check that it resolves.
5. **ADR placement.** Each Modify path sits in an area that an ADR or a Laws document may govern; read those. When one fixes where such content lives (a reference file beside the file that points to it, an index that must name each such file, a directory kept for that kind of content), Files owned carries that file as well, and What to build assigns each piece of content to its file.

Then apply the **no-placeholder rule** to all six sections. A section fails when it is empty or holds `TBD`, `TODO` or a lone `?`; when it promises "appropriate" handling, validation or edge cases without naming them; when it asks for tests and lists no scenarios; when it says "similar to #N" in place of content; when an Interface names something no issue produces; or when a criterion cannot be checked. `spp lint ticket` catches the mechanical half of this list. The rest is yours to catch.

## 3. Write and lint

Write the body to a file unique to this issue, put it with `gh issue edit <N> --body-file <file>`, and set the size label (removing any other `size:` label first). Run `spp lint ticket <N>`. Each line it prints names a rule and what failed; fix the body, write it again, and re-run until it prints `ok`.

## 4. A gap only a person can close

Some gaps cannot be fixed from the code: a scenario with nothing to assert on until someone decides what the output is, a Verify command red on the default branch for a reason outside this issue, an Interface the Epic leaves open, a placement no law settles. Route the issue: `gh issue edit <N> --add-label needs-info --remove-label ready-for-agent`, then post one comment under the heading **Still open**, one bullet per gap, each naming the section it blocks.

## Done when

One of these holds, and you tell the caller which, with the size:

- `spp lint ticket <N>` prints `ok`, all five code checks pass, and no placeholder remains.
- The issue carries `needs-info` and one comment naming every gap still open.
