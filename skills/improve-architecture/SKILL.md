---
name: improve-architecture
description: Hunt for deepening opportunities across the repo or in one pull request, explore the one you pick, and file each one you accept as an issue.
disable-model-invocation: true
argument-hint: "[area | pr | PR number or URL]"
---

Look for modules that make their callers learn too much, show them to the person as **Deepening opportunities**, explore the one they pick, and file each one they accept as an issue. The run produces ideas and issues. It changes no code and passes no verdict: nothing it says approves, blocks or holds a merge.

## Choose the scope

Read the scope from what follows `/improve-architecture`:

| Argument | Scope |
| --- | --- |
| Nothing, or an area (a directory, a subsystem, a pain point) | **Repo**: hot spots across the codebase, or the named area |
| `pr`, a pull request number, or a pull request URL | **Pull request**: every module it touches. `pr` alone means the open pull request for the current branch |

Done when you have told the person the scope in one line.

## 1. Load the words

Call the Skill tool with "codebase-design" and follow its pointer to the Depth check; the four questions, the reading limit and the Timing values live there and nowhere else. Read the repo's `GLOSSARY.md` and every ADR whose subject overlaps the code in scope, so opportunities are named in the project's nouns and settled decisions are not argued again.

## 2. Find where to look

**Repo scope.** When the person named an area, that is the scope. Otherwise rank files by how often recent history changed them, since a deeper module pays off where the next changes will land:

```bash
git log --since="6 months ago" --name-only --format= | grep -v '^$' | sort | uniq -c | sort -rn | head -40
```

Group the busiest files into the modules they belong to and keep the top handful. When the churn is spread thin with no clear cluster, widen the window or ask the person for an area.

**Pull request scope.** Fix both ends of the comparison without touching the person's checkout:

```bash
PR=<number or URL>   # for `pr` alone, leave PR empty: gh then reads the current branch
read -r N BASE_REF HEAD <<<"$(gh pr view $PR --json number,baseRefName,headRefOid --jq '"\(.number) \(.baseRefName) \(.headRefOid)"')"
git fetch origin "$BASE_REF" "pull/$N/head"
BASE=$(git merge-base "origin/$BASE_REF" "$HEAD")
git diff --name-only "$BASE" "$HEAD"
```

Read each file as the pull request leaves it with `git show "$HEAD:<path>"`. When `pr` finds no open pull request, compare the current branch with its merge-base on the default branch instead, and skip the posting question in step 4.

Done when you have the list of modules in scope (repo) or have said `<base7>..<head7>, N files` (pull request). An empty diff or a ref that does not resolve ends the run here.

## 3. Read with the Depth check

Put all four Depth check questions to every module in scope, reading exactly what the check's scope rules allow. In pull request scope that is the survey's width: all modules the pull request touches, including those whose interface it leaves alone. In repo scope there is no pull request, so ask each question of the module as it stands today ("is it shallow now", "do its tests reach past its interface").

When the harness can start a helper agent, hand it the reading. It sees nothing of this conversation, so its brief carries the scope list, `BASE` and `HEAD` for a pull request, and where to find `GLOSSARY.md`, the ADRs that apply, and codebase-design's `SKILL.md` and `DEPTH-CHECK.md`. Otherwise read the modules yourself.

Each question that fires is one opportunity, carrying:

- **Files**: the module and its direct callers.
- **Problem**: which question fired, in codebase-design's words.
- **Direction**: the module now and after, a line each; a direction, never a design.
- **Payoff**: the leverage or locality gained, and which tests shrink or go.
- **Strength**: `Strong` (it clearly pays and the shape is plain), `Worth exploring` (it likely pays, the shape is open) or `Speculative` (it pays only if a change nobody has planned arrives).
- **Timing**, pull request scope only: `This PR`, `Follow-up` or `Leave it`, with a line of reason. `Leave it` opportunities are listed too.
- **ADR**: only when the opportunity contradicts one and the friction is strong enough to reopen it.

Done when every module in scope has an answer to all four questions (a no counts) and every opportunity carries its calls. Finding none is a valid result: say so and end the run.

## 4. Report

Read [`FORMATS.md`](FORMATS.md) for the format of your scope, then produce it.

- **Repo scope**: the visual report, written to the session's scratch directory.
- **Pull request scope**: report cards in the conversation. When a pull request exists, ask whether to post the cards as a comment on it, and comment only when the person clearly says yes. Liking an opportunity is not that yes.

Then ask which opportunity to explore. Hold back any interface design until the person picks; "none" ends the run.

## 5. Grill the pick

Call the Skill tool twice, for "grilling" and "domain-modeling". Run the interview by `grilling` over the picked opportunity: the constraints, the callers it must serve, what the deeper module should look like, what goes behind its seam, which of today's tests still hold once callers use the new interface, and in pull request scope whether the Timing still holds. Apply `domain-modeling` throughout: a deepened module named after a concept the glossary lacks gets its entry, and a rejection whose reason a later run would need gets an ADR offer, so the same idea is not raised again.

When the interface itself is the open question, run codebase-design's design it twice and put the rivals to the person.

Done when the person accepts a shape for the opportunity or rejects it.

## 6. File what was accepted

Each accepted opportunity becomes one issue in the repo's issue tracker. Decide its path with the person first:

| Size of the change | Path | Next step for the person |
| --- | --- | --- |
| One pull request's worth | Single-issue path | Run `/triage <N>`, then `/build <N>` |
| More than one pull request | Epic path | Run `/to-spec` in this conversation, naming #N, while the grilling is still in it |

Write the body to a file in the session's scratch directory with these sections: Problem, Direction, Files, Payoff, Strength, Timing (and the pull request) in pull request scope, What the grilling settled, and Path. Show it, and file it after the person says yes:

```bash
gh label create needs-triage 2>/dev/null || true
gh issue create --title "<deepening, in glossary nouns>" --body-file "<file>" --label needs-triage
```

Done when every accepted opportunity has an issue URL, or the person declined to file it. Then offer the next opportunity from the report; "none" ends the run.

## Guardrails

- Ideas, never a verdict. No approval, no change request, no "fix before merge".
- Read-only on code. The run writes only the report file, glossary entries and ADRs through `domain-modeling`, the issues the person approved, and a pull request comment after a yes.
- Every comment and every issue waits for its own explicit yes.
