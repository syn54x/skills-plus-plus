---
name: implement-issue
description: The worker's procedure for one buildable issue, from readiness and the claim to a verified pull request that closes it. Use when a driver, a brief or a person hands you a Sub-issue or One-off carrying Files owned, Interfaces, Test scenarios and a Verify block, or when you are resumed for a fix round on such an issue.
---

You build exactly one issue and hand back exactly one pull request. Any issue that carries the **Ticket contract** counts, whether it is a Sub-issue of an Epic or a One-off with no parent. The person or orchestrator who reads your pull request merges it; you never do. You touch no other issue's Files owned, you start no other worker, and you leave the review to the gate.

Every state change in this procedure is a capability: claim, write the progress comment, post a note, run Verify, hand back. Before step 1, read the reference file for the harness you are on; on Claude Code that is [`CLAUDE-CODE.md`](CLAUDE-CODE.md), which names the command behind each capability and the hooks that act for you. You never post an issue comment or edit a label any other way.

A **note** is one line, posted at each milestone: claimed, first red test, green, Verify passed or failed, pull request open, blocked and why. Where a hook already posts one of these, let it.

## 1. Readiness

Fetch the issue (body, state, labels, assignees, parent, blockers) and its comments. If any of these is false, stop and report, writing nothing to the issue. A hand-back clears whatever claim the issue carries, so an issue held by anyone else is never handed back, only reported. The stop gate lets you finish while your branch has no commits of its own.

- The issue lives in the repo you are standing in, since `Closes #N` only links within one repo.
- It is open and labelled `ready-for-agent`, and every issue blocking it is closed.
- It is not held, or it is held by you: no `claimed` label and no assignee, or a progress comment whose Worker line names you (a fix round). Report "held by <name>" otherwise.

Then read the contract. What to build, Acceptance criteria, Files owned, Interfaces, Test scenarios and Verify must each be present and concrete. A section that is missing, empty or a placeholder ("TBD", "as in #N", "handle errors appropriately") leaves nothing to build against. The checks above have shown the issue is not held by anyone else, so hand it back on the `needs-info` route, naming the gap, and stop: that takes it out of the ready queue, where it would otherwise be picked up again every Wave.

Then run `spp lint ticket <N>`, the ready gate: it fails when the Verify block lacks the pin harden wrote or changed since, because anyone who can edit the issue can rewrite those commands. On any failure, stop: run no Verify command, not even by hand, and hand the issue back on the `needs-info` route with the lint's lines as the reason.

Read the Laws before writing anything, from three places:

1. The repo: each document the Routing block in `CLAUDE.md` or `AGENTS.md` lists as a Law. For a directory such as the ADRs, read only the records relevant to Files owned.
2. The Epic, when the issue has a parent: its Implementation Decisions, Testing Decisions and Out of Scope, and the plan comment's Constraints, Narrowed and Deviated lines.
3. Every document the issue itself cites.

List, for each Law that names a moment ("before a second copy", "when a component gains a second host"), that moment and the observation that satisfies it. Step 4 checks those at their moment; step 6 checks the rest.

The step is done when every Law has a line in that list.

## 2. Claim

On a fresh issue, claim it, then write the progress comment with status `in-progress` and your name as Worker, so anyone who finds the claim can see whose it is. Post the note `claimed`. On a fix round the claim is already yours; skip to step 4 on the branch you left.

## 3. Branch

The base is the Epic's integration branch for a Sub-issue and the default branch for a One-off. The brief names it; without a brief, read it from the Epic's plan comment. Fetch it and cut `sdd/<N>-<slug>` from `origin/<base>`, never from wherever the checkout happens to stand. When the brief already cut that branch from that base, stay on it. Record the branch on the progress comment.

The step is done when `git merge-base HEAD origin/<base>` equals the tip of `origin/<base>`.

## 4. Build

Call the Skill tool with "tdd" and follow its loop, one test per Test scenario line, in the order the issue lists them. When the issue is a bug (its Verify block reproduces a failure), call the Skill tool with "diagnosing-bugs" first and let its red command lead. Post the note `first red: <test>` at the first failure you trust and `green` when the last scenario passes.

**Prose issues.** When Files owned are only skill files, reference files or docs pages, each scenario resolves to a Verify command and the Verify block is your test. Run it before the first edit and keep every failing command: that is red. Make the edits in scenario order until each command passes. A command already passing before any edit is a weak pin; list it as `No RED: <command>` in the pull request so the gate weighs it accordingly. Prose meant for people (a docs page, a docstring) starts with this call: Call the Skill tool with "writing-for-humans".

**Files owned.** Create and edit only what Files owned lists. A file the slice cannot ship without may be touched, and the pull request names it with the reason under Outside Files owned. Another issue's Files owned are never yours, even when the edit looks trivial.

**Interfaces.** Ship every Produces line with exactly the name and signature written, because another worker is coding against it now. Import every Consumes item by the name its producer published; if the merged name differs, stop and report rather than alias it. A Consumes item from another repo that you cannot reach yet means `BLOCKED`.

An **Interface deviation** is the one exit. When a signature the issue gives for code inside this repo turns out unworkable, ship a version that works, explain the swap on its own `Interfaces changed:` line in the pull request, and finish as `DONE_WITH_CONCERNS`. Contracts that cross a repo boundary (HTTP routes and their payloads, events, generated clients) and anything the Epic spells out stay fixed: stop with `NEEDS_CONTEXT`.

**Laws at their moment.** When you reach the moment a Law names, run its check before writing the line it governs (often a search: is there already a copy, a second host, a test covering the affordance?) and act on the answer in this pull request.

Type-check and rerun your current test file often. The full suite is CI's job. Commit in small conventional commits; leave the history unsquashed.

**Escalate rather than guess** when the issue needs an architectural choice with more than one fair answer, when understanding the code needs more than the brief and the issue gave and you cannot find it, when the plan did not foresee the restructuring the work needs, or when you have read file after file without getting closer. Go to *Stopping without a pull request*.

## 5. Verify

With `git status --porcelain` empty, run Verify for the issue on the committed tree. It runs the issue's Verify block from the repo root and records the result on `HEAD`; publish that record to the remote so the gate can read it. Watch for the note `Verify passed <sha>` or `Verify failed <sha>`.

Red means fix, commit and run again. When a Verify command itself is wrong (it names a script this repo does not have), leave the issue body alone: run the nearest correct command, record why on the progress comment, and declare it on the pull request's `Verify block corrected:` line.

The step is done when the record on `HEAD` says verified. A pull request never opens on a red or missing record.

## 6. Self-review

Read `git diff origin/<base>...HEAD` end to end with a reviewer's eyes and repair what you catch. Each repair is its own commit, followed by a fresh step 5.

- Nothing was built that the issue did not ask for, and every file outside Files owned is declared.
- Tests assert behaviour through the agreed seams, and their output is clean.
- Names say what a thing does.
- **Laws**: compare every Law from step 1 with the diff and draft the Laws lines. For each source, write a line per Law the diff engages, saying how it complies, or a single `n/a: <reason>` when that source has none.
- **Ticket**: walk the acceptance criteria, then the Test scenarios, in the issue's order, and give each one the test (`file::name`) or hunk (`file:line`) that meets it. An item you cannot tie to a test or a hunk is unfinished work, so finish it now; `n/a` is never the answer here.
- **Interfaces**: collect each exported name the diff creates, deletes or reshapes within Files owned and pair it with its Produces line. Revert or declare every name without a partner; `Interfaces changed: none` is true only when all of them pair up.

## 7. Open the pull request

Call the Skill tool with "pr" and write the body to a file that belongs to this issue alone, made fresh for this run (a temp file named for the issue number), because sibling workers write theirs at the same moment. The body's sections come from step 6; its first line is `Closes #<N>`.

Push the branch and open the pull request into the base from step 3, titled `<type>: <issue title> (#<N>)`. Set the progress comment to `pr-open` with the pull request and the verified short SHA. Never merge it, and never push to the default branch.

## 8. Check your claims

Against the pushed branch, confirm each of these, and fix (commit, step 5, push) or withdraw any that fails:

- Every test, file and hunk the pull request names is in `git diff origin/<base>...origin/<branch>`.
- The Ticket section covers every acceptance criterion and every Test scenario.
- Any test changed since it first failed has passed again on the final commit, and the verified SHA is the pushed head.
- `git status --porcelain` is empty.

## 9. Report

End with one fenced JSON object and nothing after it:

```json
{ "ticket": 218, "pr": "https://github.com/o/r/pull/9", "verifySha": "abc1234",
  "status": "DONE", "notes": "..." }
```

- `status`: `DONE`; `DONE_WITH_CONCERNS` (finished, but a deviation or a doubt about correctness or scope remains); `BLOCKED` (cannot finish); `NEEDS_CONTEXT` (information is missing).
- `pr` and `verifySha` are `null` when no pull request opened.
- `notes`, in 200 words or fewer: the commits (short SHA and subject), the red command with its failing output and the green command with its passing output, and each concern. For `NEEDS_CONTEXT`, open with the kind: a **missing fact** (a path, value or name nobody gave you) or an **unsettled design** (several reasonable designs remain open in the Epic, or what it decided clashes with the code). Then list the attempts made and the one thing that would let you continue.

## Stopping without a pull request

Hand the issue back with one call, giving the route and the reason: `needs-info` when the issue is unclear or disagrees with the code, `ready-for-human` when only a person can decide or supply a secret, `blocked` when something stops the work that no blocked-by edge records yet (name the blocking issue if you can). The one call records why on the progress comment, labels the route and clears the claim. Post the note `blocked: <why>`, push what is committed, record the stop on `HEAD` as blocked so the stop gate lets you finish, and report.
