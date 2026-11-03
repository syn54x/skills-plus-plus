---
name: retro
description: Review one coding session and suggest fixes to the agent's environment (pointers, checks, reviewer rules, a leaner CLAUDE.md), ranked by severity.
disable-model-invocation: true
metadata:
  credits:
    - skill: retro
      author: Matt Pocock
      url: "https://github.com/mattpocock/skills/tree/main/skills/engineering/retro"
---

A look back at one session, aimed at the next one. The output is a ranked list of changes to the agent's surroundings (instructions, checks, tools, access), not a review of the code it produced. It is the learning loop for work too small for an Epic; `close-epic` is the same loop for an Epic, and both write learnings in one format.

Usage: `/retro [session]`

## 1. Load the rules

Call the Skill tool with "writing-for-agents". Every suggestion this skill makes changes a document an agent reads, and that skill decides how such a document should read.

## 2. Read the session

Read the session the person names; with no name, read this one. Read the transcript itself, not a summary of it. On Claude Code, `CLAUDE-CODE.md` says where earlier sessions are stored.

Then read what the agent was steered by: the repo's `CLAUDE.md` or `AGENTS.md`, the person's global one, the check commands the repo declares (`package.json` scripts, a task runner, the CI workflow, pre-commit hooks), and any reviewer rules file.

Done when you can list each place the session lost time, tokens or correctness, with the turn where it happened.

## 3. Find candidates

Hold each loss from step 2 against these lenses. A loss can match more than one; keep the change that removes it most cheaply.

- **Navigation pointers.** The agent searched long for a file, or missed that two files change together. One line where the agent already looks ("schema changes also touch `src/db/types.ts`") would have sent it straight there.
- **Automated checks over written rules.** The agent made a mistake a machine could catch. First look for a check the repo already has that is unwired or broken; fixing it beats writing a new one. A pattern rule (a banned import, a file in the wrong folder, a forbidden call) becomes a lint rule, a hook or a CI job, never a sentence. A repo with no check that runs on every change (no pre-commit hook, no CI job) is a finding in itself.
- **Reviewer rules.** The reviewer let something through that only judgement can catch (consistency across files, fit with the surrounding code). That rule goes in the reviewer's instructions, where it costs the implementer nothing. A rule a machine could check goes to the lens above instead.
- **Trimming `CLAUDE.md`.** Every line of it is read by every session. A rule only some sessions need moves behind a pointer; a rule only review needs moves to the reviewer; a mechanical rule becomes a check. Look at the person's global file as well as the repo's.
- **Tool economy.** A call that returned far more than the agent used (a whole log, an unfiltered listing, a tool that dumps its full state), or the same lookup repeated. Suggest the narrower call, or a small command that returns only the answer.
- **No-ops.** A line in a steering file that changed nothing the agent did in this session, and would not in any other. Apply the no-op test from writing-for-agents and suggest deleting the whole line.
- **Information access.** The agent guessed because it could not see something: a dev server's log, a service's state, a database schema. Suggest the read-only access that would have answered it.

Implementation carries the heavy context (exploring, writing, debugging); review sees only a diff. So a standard the reviewer can enforce belongs with the reviewer, and the implementer's context keeps only what it needs to build.

## 4. Present

Read `../close-epic/LEARNINGS.md` and write each candidate in that format, highest severity first. Each one names its evidence from the session (the turn, the call, the count) and the exact file the change lands in.

Present the list and stop. Make a change only when the person picks it, and then call the Skill tool with "writing-for-agents" again before editing a skill, `CLAUDE.md` or `AGENTS.md`.
