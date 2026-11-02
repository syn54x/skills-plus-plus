## What it does

`harden` writes the Ticket contract into one GitHub issue: What to build, Acceptance criteria, Files owned, Interfaces, Test scenarios, a Verify block, and a single size label. After it runs, a worker who reads only that issue can build it.

It writes from the repository, not from the plan. Before a section goes into the issue, `harden` checks it against the code, because the plan is usually where a wrong file list or an unrunnable command comes from. Then `spp lint ticket` checks the result mechanically. It ends in one of two states: the lint prints `ok`, or the issue is labelled `needs-info` with a comment saying what a person still has to decide.

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
| How do I know I am finished? | Test scenarios, Verify | scenario data exists, Verify resolves and passes on the base branch |

## Common questions

**Why is this a separate skill from to-tickets?**
Both to-tickets and triage need to write the same contract. When the rules lived inside to-tickets, triage had to read another skill's files to follow them, and a user-invoked skill cannot be called by another. One model-invoked skill now holds the rules and both callers use it.

**What does `spp lint ticket` check, and what is left to `harden`?**
The lint checks what a script can: every section present, a fenced Verify block, the shape of Files owned and Test scenario lines, exactly one size label, and no `TBD`, `TODO` or similar marker. Whether the scenarios assert on real data, whether the file list is complete, and whether the commands run are questions about the repository, so `harden` answers them before the lint runs.

**My issue was labelled `needs-info`. What happens next?**
The comment titled **Still open** lists each gap and the section it holds up. Settle those (an output wording, an Interface the Epic left open), then run `/harden <N>` again.

**Why did Files owned list a test fixture the change never mentioned?**
That fixture asserts the output being changed. The search for those runs over the whole tree, so a pinned string in a root-level fixture or a CI step is owned up front, and the worker never has to edit a file it does not hold.

**Can a Verify command fail before the work starts?**
Only one that runs tests the issue will add. Every other command, such as a lint or a typecheck, has to pass on the base branch first, meaning the branch the work will start from: the Epic's integration branch when it already exists, otherwise the branch build will cut it from (the default branch unless the Epic or the Routing block names another), and for a One-off, the default branch; otherwise the worker would start from a failure it did not cause.

## It's working if

- `spp lint ticket <N>` prints `ok`, or the issue carries `needs-info` and a **Still open** comment.
- Workers' pull requests never report a corrected Verify block.
- No pull request edits a file outside its Files owned to make a test or a caller pass.
- Each Test scenario reads as something done and what it caused.
