---
name: ask-spp
description: Name the spp path and skill that fit what you are doing, and the command to type next.
disable-model-invocation: true
argument-hint: "[what you are trying to do]"
metadata:
  credits:
    - skill: ask-matt
      author: Matt Pocock
      url: "https://github.com/mattpocock/skills/tree/main/skills/engineering/ask-matt"
---

Route the person to the path and skill that fit their situation. You recommend and they type: a router starts nothing, and only the person can start a user-invoked skill.

The lines below orient you; they are not the skills. Before you tell the person what a skill does beyond its line here, or advise skipping a step, read that skill's `SKILL.md`.

## Steps

1. Take the situation from the arguments, else from the conversation so far. When neither says what the person is trying to do, ask that one question and wait for the answer.
2. Place the situation on one of the five paths. A need that sits on no path is one skill on its own: find it under Every skill.
3. Reply with the path, the command to type now, and the step after it. Name a second option only when two fit, and give the one fact that decides between them.

## The five paths

Every path but tiny unfiled work needs the repo set up once with `/setup-spp`, since `/triage`, `/wayfinder`, `/to-spec` and `/build` each stop in a repo without it. If the person has not run it, that is the command to type now, before the path's first step.

| Path | The situation | The route |
| --- | --- | --- |
| 1. Epic | A change too large for one session, and you can see how to get there | `/grill`, or `/auto-grill` when the code and docs already answer most questions; `/to-spec`; `/to-tickets <epic>`; `/build <epic>`, which gates each slice and runs the review panel on its own when the Epic is large; the person merges; `/close-epic <epic>` |
| 2. Single issue | A filed bug or enhancement | `/triage <N>` hardens it into a One-off (a bug's reproduction becomes its Verify block, red on main); `/build <N>` |
| 3. Unknown territory | An effort too large for one sitting, and the way there is not visible yet | `/wayfinder` charts a map and settles one decision per session; once the map has a destination, `/to-spec` in that conversation joins path 1 |
| 4. Architecture | Code that resists change, or a pull request whose shape you want judged | `/improve-architecture`; each issue it files enters path 1 or path 2 |
| 5. Tiny unfiled work | A change one session finishes, with no issue behind it | No spp: make the change directly |

Three pairs get confused:

- `/discuss` or `/grill`: the idea is not yet a plan, or it is.
- `/grill` or `/wayfinder`: one sitting can settle every decision, or it cannot.
- `/to-spec` or `/triage`: the work needs several Sub-issues, or one pull request holds it.

## Every skill

The person can type any of these. Model-invoked skills also start on their own when a task fits, so the person rarely needs them by name.

| Skill | Flow | Started by | Reach for it when |
| --- | --- | --- | --- |
| `/discuss` | Plan | either | an idea is still vague and wants talking over before any plan (experimental) |
| `/grill` | Plan | person | a plan needs every choice settled, with terms and decisions recorded as they land |
| `/auto-grill` | Plan | person | the same interview, with the answers the code, ADRs or docs hold settled for you |
| `/grilling` | Plan | either | a plan, design or decision needs stress-testing round by round, with no recording |
| `/domain-modeling` | Plan | either | a term is vague or overloaded, or a hard-to-reverse decision needs an ADR |
| `/codebase-design` | Plan | either | one module's interface or seam needs designing |
| `/research` | Plan | either | a decision waits on an outside fact |
| `/prototype` | Plan | either | talking has not settled a design question |
| `/wayfinder` | Plan | person | path 3 |
| `/to-spec` | Plan | person | a grilled plan becomes an Epic |
| `/to-tickets` | Plan | person | an Epic becomes Sub-issues |
| `/triage` | Plan | person | path 2 starts, or the incoming queue needs sorting; it asks `/delegating` whether `/triaging` runs here or in a sub-session |
| `/triaging` | Plan | either | a session, such as a Chief of Staff, is told to triage a specific issue number |
| `/harden` | Plan | either | one issue needs its Ticket contract written or repaired, as when `spp lint ticket` fails |
| `/build` | Build | person | an Epic or a hardened One-off is ready; it asks `/delegating` whether `/building` runs here or in a sub-session |
| `/building` | Build | either | a session, such as a Chief of Staff, is told to build a specific Epic or issue number |
| `/delegating` | Build | either | an entry skill hands one issue's `building` or `triaging` to run here or in a sub-session |
| `/implement-issue` | Build | either | one hardened issue needs building alone; `/build` gives each worker this |
| `/tdd` | Build | either | a behaviour should be built test-first |
| `/diagnosing-bugs` | Build | either | something is broken, flaky or slow and the cause is unknown |
| `/review` | Review | either | one pull request needs its spec and quality verdicts |
| `/review-panel` | Review | person | a pull request to main should be read from several angles |
| `/improve-architecture` | Review | person | path 4 |
| `/pr` | Ship | either | a pull request body is being written |
| `/prepare-release-notes` | Ship | person | a release needs its highlights drafted |
| `/close-epic` | Ship | person | an Epic's pull request to main has merged |
| `/retro` | Ship | person | a session without an Epic went badly and the setup should learn from it |
| `/writing-for-humans` | Write and talk | either | a person will read the text |
| `/writing-for-agents` | Write and talk | either | an agent will read the text and act on it |
| `/eli5` | Write and talk | person | an explanation did not land (modes eli5, adhd and wait-what) |
| `/setup-spp` | Meta | person | a repo has not been set up, or its Routing block should change |
| `/ask-spp` | Meta | person | the person does not know which of these fits |
| `/spp:feedback` | Meta | either | you wish spp or a skill did something, or complain about one (the bare `/feedback` is Claude Code's own and reports to Anthropic) |

## Watching a build

The person follows an Epic in flight with the epic board (`/epic-board <epic>`), or with `spp status <epic>` in any terminal. Neither is a skill, and both only display.

## Done when

- The reply names one path, or one skill when no path fits, and the command to type now.
- Every claim about a skill beyond its line here came from reading that skill's `SKILL.md` in this run.
- No skill was started.
