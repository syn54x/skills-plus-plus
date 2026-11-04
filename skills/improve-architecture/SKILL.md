---
name: improve-architecture
description: Hunt for deepening opportunities across the repo or in one pull request, explore the one you pick, and file each one you accept as an issue.
disable-model-invocation: true
argument-hint: "[area | pr | PR number or URL]"
metadata:
  credits:
    - skill: improve-codebase-architecture
      author: Matt Pocock
      url: "https://github.com/mattpocock/skills/tree/main/skills/engineering/improve-codebase-architecture"
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

Write up each question that fires as the Depth check's own write-up rule says, Timing included in pull request scope, and keep every `Leave it` one. In repo scope, drop the Timing and record instead the module's churn (commits in the window that touched it) and how many places call it. Then give every opportunity a Strength, judged by how sure you are that deepening pays:

| Strength | When |
| --- | --- |
| `Strong` | The callers' cost is visible today and the deeper interface is already easy to picture |
| `Worth exploring` | The cost is real, but the better interface is not yet clear |
| `Speculative` | It pays only if a change nobody has planned arrives |

Done when every module in scope has an answer to all four questions (a no counts), every opportunity has its write-up and a Strength, and the modules where nothing fired are listed. Finding none is a valid result: say so and end the run.

## 4. Report

Read [`FORMATS.md`](FORMATS.md) for the format of your scope, then produce it.

- **Repo scope**: the HTML page, written to the session's scratch directory.
- **Pull request scope**: the Markdown summary, in the conversation. When a pull request exists, ask whether to post the summary as a comment on it, and comment only when the person clearly says yes. Liking an opportunity is not that yes.

Then ask which opportunity to explore. Hold back any interface design until the person picks; "none" ends the run.

## 5. Grill the pick

Call the Skill tool twice, for "grilling" and "domain-modeling". Run the interview by `grilling`, and apply `domain-modeling` to every name and decision it produces. Settle these, in this order, because each answer narrows the next:

1. **Is it worth it now?** Weigh the churn and the callers' cost against the work. A no ends the pick here.
2. **What is the module for?** One sentence in glossary nouns. A purpose that needs an "and" is two modules.
3. **What does each caller need from it?** Walk the real call sites, one at a time.
4. **What reaches outside the process?** That decides how it will be tested; codebase-design's deepening strategies give the choice.
5. **What is the smallest interface that serves every caller?** When this is the open question, run codebase-design's design it twice and put the rivals to the person.
6. **How do callers move over?** All at once, or one at a time behind the new interface, and which existing tests are rewritten against it or deleted.

In pull request scope, end by asking whether the Timing still holds. When the person drops the opportunity for a reason that will still be true next time, that reason is a candidate ADR: the next survey will find the same module.

Done when the person accepts a shape for the opportunity or rejects it.

## 6. File what was accepted

Each accepted opportunity becomes one issue in the repo's issue tracker. Decide its path with the person first:

| Size of the change | Path | Next step for the person |
| --- | --- | --- |
| One pull request's worth | Single-issue path | Run `/triage <N>`, then `/build <N>` |
| More than one pull request | Epic path | Run `/to-spec` in this conversation, naming #N, while the grilling is still in it |

Write the body to a file in the session's scratch directory. It opens with the module's purpose sentence from the grilling, then holds: the interface the person accepted and the callers that move to it; the order of the move and the tests it rewrites or deletes; the evidence (the Depth check question that fired, the Strength, and the Timing and pull request link or the churn); anything the grilling ruled out of this issue; and the path. Show it, and file it after the person says yes:

```bash
gh label create needs-triage 2>/dev/null || true
gh issue create --title "<deepening, in glossary nouns>" --body-file "<file>" --label needs-triage
```

Done when every accepted opportunity has an issue URL, or the person declined to file it. Then offer the next opportunity from the report; "none" ends the run.

## What the run may write

The report file in the scratch directory; glossary entries and ADRs through `domain-modeling`; the issues the person approved; and the one pull request comment, after its yes. Every comment and every issue waits for its own yes. Code files are only ever read.
