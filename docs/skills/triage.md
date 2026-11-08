## What it does

`triage` takes one filed bug or enhancement and leaves it holding exactly one Triage role: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human` or `wontfix`. Before it picks one, it puts four questions to the issue: is the behaviour already built, was it refused before, is the claim true, and is the request clear? When the last answer is no, it interviews you, one round at a time.

An issue only leaves as `ready-for-agent` when a worker could build it without asking anything. For that outcome `triage` calls [harden](harden.md), so the issue gains the Ticket contract and one size label, and the role is added only once `spp lint ticket` prints `ok`. A bug gets one extra step: the agent reproduces it, and the reproduction becomes the first command of the Verify block, failing on the default branch until the fix lands. Every comment it posts opens with a line saying an AI wrote it.

## When to reach for it

You type `/triage`, with an issue number or with nothing to see what needs attention; the agent never starts it. It is step one of the single-issue path: triage, then `/build <N>`. Point `/build` at an issue with no contract and it sends you here.

| Your situation | Use |
| --- | --- |
| Someone filed a bug or a small request | `/triage <N>` |
| The idea is large and nothing is filed yet | [grill](grill.md), then [to-spec](to-spec.md) |
| An Epic needs cutting into Sub-issues | [to-tickets](to-tickets.md) |
| One issue has a contract that fails the lint | [harden](harden.md) |

Run `/triage` on an Epic and it stops, since an Epic goes to `/build` as it is. It stops on a Sub-issue that already carries its contract too, and points you to `/build` on that Sub-issue's Epic. `ask-spp` routes between every skill when the right one is unclear.

## Prerequisites

The repo needs the five state labels, which `/setup-spp` creates. Without them, `triage` asks you to run it and stops.

## The reproduction is the test

For a bug, the Verify block opens with the reproduction. Suppose the report says `notes add` crashes when the text holds a quote. The agent runs `notes add "it's late"` on the default branch, sees `Unterminated string` and exit code 1, and gives harden that command, noting that it fails today because it is the bug. harden writes it as the first Verify line, so the worker starts from a red it can see and the reviewer later runs the same line and watches it turn green.

If the bug does not reproduce, or the report is too thin to try, the outcome is `needs-info` with specific questions, and no contract is written.

## Common questions

**Why did `triage` label my clear issue `ready-for-human`?**
The work is larger than one pull request: it splits into behaviours that could each be shown alone, or needs a design choice across modules that nobody has made. The comment tells you to run `/grill`, then `/to-spec`, which turns the issue into an Epic. A One-off can be big and still be one pull request, so size alone never sends an issue there.

**I told it to move an issue straight to `ready-for-agent`. Why did it still do work?**
Skipping the questions is yours to ask for. The reproduction and the lint are not matters of opinion, and a worker handed an issue with no Verify block would stop at its readiness check, so a move to `ready-for-agent` still passes through both.

**What is `.out-of-scope/`, and who writes it?**
It holds one short note for each rejected idea, with the reason and the issues that asked. `triage` writes or extends one when you reject a request, shows it to you, and commits nothing without your say. The next issue that resembles it is matched against the note. An issue closed because the code already does the thing gets no note.

**Why does every comment begin with a disclaimer line?**
Triage comments read like a maintainer's. The line tells the reporter an AI wrote it, so they can answer or push back with that in mind.

**Does it triage pull requests?**
No, only issues. A pull request goes to [review](review.md).

## It's working if

Watching a run, you see:

- the agent run the reproduction and show you its failing output before it calls a bug confirmed;
- a `ready-for-agent` label go on only after `spp lint ticket` has printed `ok`, with the issue already holding one size label and its Verify block pinned by harden, or re-pinned from the agent's own file when it had to put the reproduction back;
- the agent reread the issue body after harden and confirm the reproduction is still the first Verify line;
- the issue's label list change by one swap, ending with a single state label, and a comment starting with the disclaimer beside it;
- no question put to you that the code, the issue thread or `.out-of-scope/` could have answered;
- for a rejection, a new or extended file in `.out-of-scope/` shown to you before the issue is closed as not planned.
- for a reproduced bug whose lines came from a pull request the review gate passed, the output of `spp signal` naming that pull request.
