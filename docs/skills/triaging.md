## What it does

`triaging` takes one filed bug or enhancement and leaves it holding exactly one Triage role: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human` or `wontfix`. Before it picks one, it puts four questions to the issue: is the behaviour already built, was it refused before, is the claim true, and is the request clear? When the last answer is no, it interviews you, one round at a time.

An issue only leaves as `ready-for-agent` when a worker could build it without asking anything. For that outcome `triaging` calls [harden](harden.md), so the issue gains the Ticket contract and one size label, and the role is added only once `spp lint ticket` prints `ok`. A bug gets one extra step: the agent reproduces it, and the reproduction becomes the first command of the Verify block, failing on the default branch until the fix lands. Every comment it posts opens with a line saying an AI wrote it.

## When to reach for it

Type `/triaging <N>`, or the agent starts it when it is told to triage a specific issue number. You will usually type [triage](triage.md) instead, which lets you pick an issue and hands it to `triaging`. A session told "use triaging for #N" triages N the same way, so an agent that sends work out, such as a Chief of Staff session, can start one session per filed issue without you typing `/triage`. It is step one of the single-issue path: triage, then `/build <N>`.

| Your situation | Use |
| --- | --- |
| Someone filed a bug or a small request, and you want to pick it from a list | [triage](triage.md) |
| An agent should triage one known issue | `triaging`, told the issue number |
| The idea is large and nothing is filed yet | [grill](grill.md), then [to-spec](to-spec.md) |
| One issue has a contract that fails the lint | [harden](harden.md) |

Run it on an Epic and it stops, since an Epic goes to `/build` as it is. It stops on a Sub-issue that already carries its contract too, and points you to `/build` on that Sub-issue's Epic. [ask-spp](ask-spp.md) routes between every skill when the right one is unclear.

## Prerequisites

The repo needs the five state labels, which `/setup-spp` creates. Without them, `triaging` asks you to run it and stops.

## The reproduction is the test

For a bug, the Verify block opens with the reproduction. Suppose the report says `notes add` crashes when the text holds a quote. The agent runs `notes add "it's late"` on the default branch, sees `Unterminated string` and exit code 1, and gives harden that command, noting that it fails today because it is the bug. harden writes it as the first Verify line, so the worker starts from a red it can see and the reviewer later runs the same line and watches it turn green.

If the bug does not reproduce, or the report is too thin to try, the outcome is `needs-info` with specific questions, and no contract is written.

## Waiting on you

Whenever `triaging` stops for you, its message opens with one line naming what it waits on, and the detail follows:

```text
#42 waits on you: confirm ready-for-agent?
```

It asks this way for the outcome it proposes, for each round of the interview when the issue is unclear, and for an issue that arrived holding two roles. A parent session sees only the opening of a sub-session's message, so you can give a short answer (yes, or a role name) from the parent, and it is passed on quoted as yours. An interview round is answered in the sub-session itself.

The reporter's side does not change: `needs-info` asks the reporter on the issue, and their reply brings the issue back to triage wherever the first triage ran.

## Common questions

**Why did it label my clear issue `ready-for-human`?**
The work is larger than one pull request: it splits into behaviours that could each be shown alone, or needs a design choice across modules that nobody has made. The comment tells you to run `/grill`, then `/to-spec`, which turns the issue into an Epic. A One-off can be big and still be one pull request, so size alone never sends an issue there.

**I told it to move an issue straight to `ready-for-agent`. Why did it still do work?**
Skipping the questions is yours to ask for. The reproduction and the lint are not matters of opinion, and a worker handed an issue with no Verify block would stop at its readiness check, so a move to `ready-for-agent` still passes through both.

**What is `.out-of-scope/`, and who writes it?**
It holds one short note for each rejected idea, with the reason and the issues that asked. `triaging` writes or extends one when you reject a request, shows it to you, and commits nothing without your say. The next issue that resembles it is matched against the note. An issue closed because the code already does the thing gets no note.

**Why does every comment begin with a disclaimer line?**
Triage comments read like a maintainer's. The line tells the reporter an AI wrote it, so they can answer or push back with that in mind.

**Does it triage pull requests?**
No, only issues. A pull request goes to [review](review.md).

## It's working if

Watching a run, you see:

- the agent run the reproduction and show you its failing output before it calls a bug confirmed;
- a `ready-for-agent` label go on only after `spp lint ticket` has printed `ok`, with the issue already holding one size label and its Verify block pinned by harden, or re-pinned from the agent's own file when it had to put the reproduction back;
- every message that waits on you open with `#<N> waits on you:`;
- the issue's label list change by one swap, ending with a single state label, and a comment starting with the disclaimer beside it;
- no question put to you that the code, the issue thread or `.out-of-scope/` could have answered;
- for a rejection, a new or extended file in `.out-of-scope/` shown to you before the issue is closed as not planned;
- for a reproduced bug whose lines came from a pull request the review gate passed, the output of `spp signal` for the escaped defect, naming that pull request.
