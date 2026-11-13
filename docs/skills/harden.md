## What it does

`harden` writes the Ticket contract into one GitHub issue: What to build, Acceptance criteria, Files owned, Interfaces, Test scenarios, a Verify block, and a single size label. After it runs, a worker who reads only that issue can build it.

It writes from the repository, not from the plan. Before a section goes into the issue, `harden` checks it against the code, because the plan is usually where a wrong file list or an unrunnable command comes from. Then `spp lint ticket --pin <file>` checks the result mechanically and, when it passes, pins the Verify block `harden` wrote in that file. It ends in one of two states: the lint prints `ok` and the block is pinned, or the issue is labelled `needs-info` with a comment saying what a person still has to decide.

## When to reach for it

Type `/harden <N>`, or the agent starts it when a task fits. Most runs happen inside other skills: [to-tickets](to-tickets.md) calls it for each Sub-issue of an Epic, and triage calls it once to make a filed bug or enhancement into a One-off that `/build` accepts. Run it yourself when `spp lint ticket` fails on an issue, or when you wrote an issue by hand and want a worker to be able to take it.

| Your situation | Use |
| --- | --- |
| One issue needs its contract written or repaired | `/harden <N>` |
| An Epic needs splitting into Sub-issues | `/to-tickets`, which calls `harden` for each |
| Someone filed a bug or a request | triage, which reproduces or verifies it first |

`ask-spp` routes between every skill when the right one is unclear.

## Four questions

`harden` organises the contract around what the worker would otherwise have to ask:

| The worker's question | Sections | Checked against the code by |
| --- | --- | --- |
| What am I making? | What to build, Acceptance criteria, size | each criterion being false before the work starts |
| Which files are mine? | Files owned | output pins, callers of changed signatures, ADR placement |
| What do my neighbours call things? | Interfaces | codebase-design, when a module is new or reshaped |
| How do I know I am finished? | Test scenarios, Verify | the Necessity check, scenario data exists, Verify resolves and passes on the base branch |

## Common questions

**What does the Necessity check do to a scenario?**
`harden` asks of each scenario the plan proposed whether a test for it would add evidence. If an existing test already catches that break (its **Keeper**), the scenario gets no line, and its criterion ends with ``(already covered by `file::name`)`` so the worker ties the criterion to that test. Scenarios that differ only by input become one table scenario. A scenario that takes over a behaviour another layer's test covers ends with ``; replaces `file::name` ``, and that test's file joins Files owned. The rule itself lives in [tdd](tdd.md).

**Why is this a separate skill from to-tickets?**
Both to-tickets and triage need to write the same contract. When the rules lived inside to-tickets, triage had to read another skill's files to follow them, and a user-invoked skill cannot be called by another. One model-invoked skill now holds the rules and both callers use it.

**What does `spp lint ticket` check, and what is left to `harden`?**
The lint checks what a script can: every section present, a fenced Verify block, the shape of Files owned and Test scenario lines, exactly one size label, and no `TBD`, `TODO` or similar marker. Whether the scenarios assert on real data, whether the file list is complete, and whether the commands run are questions about the repository, so `harden` answers them before the lint runs.

**Why does `spp verify` say the Verify block is not pinned, or changed since it was hardened?**
A worker runs the Verify block's commands on its own machine, and anyone who can edit the issue, the person who filed it included, can change those commands after you approved them. So the last lint run stores a hash of the block in the issue's progress comment, and `spp verify` runs only a block that still matches it. The hash is taken from the file `harden` wrote, not from the issue as it reads afterwards, so an edit slipped in between is refused (the lint reports `pin-match`) rather than approved. If the change was yours and intended, run `/harden <N>` again so the new block is checked and pinned.

**My issue was labelled `needs-info`. What happens next?**
The comment titled **Still open** lists each gap and the section it holds up. Settle those (an output wording, an Interface the Epic left open), then run `/harden <N>` again.

**Why did Files owned list a test fixture the change never mentioned?**
That fixture asserts the output being changed. The search for those runs over the whole tree, so a pinned string in a root-level fixture or a CI step is owned up front, and the worker never has to edit a file it does not hold.

**Can a Verify command fail before the work starts?**
Only one that runs tests the issue will add. Every other command, such as a lint or a typecheck, has to pass on the base branch first, meaning the branch the work will start from: the Epic's integration branch when it already exists, otherwise the branch build will cut it from (the default branch unless the Epic or the Routing block names another), and for a One-off, the default branch; otherwise the worker would start from a failure it did not cause.

## It's working if

- `spp lint ticket <N> --pin <file>` prints `ok` and the progress comment shows a **Verify pin** line, or the issue carries `needs-info` and a **Still open** comment.
- Workers' pull requests never report a corrected Verify block.
- No pull request edits a file outside its Files owned to make a test or a caller pass.
- Each Test scenario reads as something done and what it caused.
- No Test scenario asks for a test that an existing test already covers: a covered scenario has no line, and its criterion names the test that keeps it.
