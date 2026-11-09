---
name: delegating
description: Run one issue's skill here or in a sub-session. Use when an entry skill hands off an issue to building or triaging.
---

You were called for one skill and one issue: `Call the Skill tool with "delegating" for <skill> #<N>`. `<skill>` is a model-invoked skill that takes one issue number (`building`, `triaging`), and N is the issue's number or URL. Your only job is to decide where `<skill>` runs, then start it there. You never do its work yourself.

Before step 1, read the reference file for the harness you are on; on Claude Code that is [`CLAUDE-CODE.md`](CLAUDE-CODE.md), which names the tool behind each capability below.

## 1. Can this session start sessions?

Test for the capability to start a separate session.

- **No** (a terminal, or any harness without it): ask nothing. Call the Skill tool with `<skill>` for N here, and follow it to the end of the run. Stop reading this skill.
- **Yes**: go on to step 2.

## 2. Ask where to run

Settle the recommendation first, from two facts:

- Has this session already started other sessions? List the sessions it started.
- Is this session's folder a checkout of N's repository? Compare the folder's git remote with the repository that owns N (the URL's, or the repository you stand in for a bare number). A folder that is not a git repository is not a checkout.

| This session | Recommend |
| --- | --- |
| Has started other sessions, or sits outside a checkout of N's repository | Sub-session |
| Neither | Here |

Ask one question before anything else: run `<skill>` for #N here, or in a sub-session. Give exactly one recommendation, with its reason in a clause ("this session already started two sessions", "this folder is not a checkout of acme/app"). End the turn and wait.

- **Here**: call the Skill tool with `<skill>` for N, and follow it to the end of the run.
- **Sub-session**: step 3.

## 3. Find the checkout

| Where you stand | Checkout |
| --- | --- |
| This session's folder is a checkout of N's repository | This folder |
| Otherwise, exactly one folder one level down has a git remote matching N's repository | That folder |
| None, or several | Ask the user which folder, naming the ones you found. Start nothing until they answer. |

Match by the remote's owner and name, whatever the protocol (`git@github.com:acme/app.git` and `https://github.com/acme/app` match). A folder's name proves nothing.

## 4. Start the sub-session

Start one session in the checkout:

- in that folder as it is, without a worktree of its own: `<skill>` only orchestrates, and anything it starts cuts its own worktrees;
- on this session's model;
- with the prompt `Use <skill> for <issue URL>.`, so the sub-session runs `<skill>` and never asks where to run again.

Tell the user the session's name and that its questions will reach this session too, then end the turn. Do nothing more for N here.

## 5. Relay

A sub-session's turn-end note reaches this session. When one opens with a line naming what it waits on (`#340 waits on you: approve Wave 1`) and the user answers it here, send the user's words to that sub-session, unchanged and quoted as the user's:

> The user answered in the parent session: "yes"

Add nothing of your own: no summary, no advice, no answer the user did not give. When the reply is ambiguous about which sub-session it answers, ask before sending.
