---
name: improve-pr-architecture
description: Read one pull request for deepening opportunities it introduced or brushed against, present them as a markdown report you can post as a PR comment, then grill through whichever one you pick.
disable-model-invocation: true
---

# Improve PR Architecture

Read one pull request through the deep-module lens and propose **deepening opportunities**: places where the PR introduced a shallow module, tested past an interface, or touched a module that was already shallow and could be deepened cheaply while the author is in there. The output is opportunities, never a verdict. `improve-` skills generate ideas; `review-` skills gate. This one never blocks a merge, never edits code, and never posts without an explicit yes.

Usage: `/improve-pr-architecture <pr# | PR URL | git ref>`, or no argument for the current branch.

Built on the same vocabulary as the other design skills:

- Call the Skill tool with "codebase-design" for the vocabulary (**module**, **interface**, **depth**, **seam**, **adapter**, **leverage**, **locality**) and its principles (the deletion test, "the interface is the test surface", "one adapter = hypothetical seam, two = real", replace-don't-layer testing). Use these terms exactly in every candidate.
- The domain language in `CONTEXT.md` names the modules; ADRs in `docs/adr/` record decisions this skill honours rather than re-litigates.

What this skill is not: a third smell reviewer. `code-review`'s Standards axis and `review-panel`'s `maintainability` persona already run the Fowler smells, and Middle Man, Speculative Generality and Shotgun Surgery brush against shallowness from the smell side. This skill's lens is narrower and deeper: interface complexity against implementation complexity, where the seam sits, and whether the tests have locality. A finding that is a smell and nothing more belongs to those skills.

## Process

### 1. Pin the diff

All three input modes end with `BASE` and `HEAD` pinned as SHAs, and `PR` set when there is a pull request to comment on.

```bash
# PR number or URL: throwaway worktree, diff against the merge-base with the PR's base branch
PR=<number-or-url>
BASE_REF=$(gh pr view "$PR" --json baseRefName --jq .baseRefName); git fetch origin "$BASE_REF"
WT=$(mktemp -d)/pr; git worktree add --detach "$WT"; (cd "$WT" && gh pr checkout "$PR" --detach)
BASE=$(git -C "$WT" merge-base HEAD "origin/$BASE_REF"); HEAD=$(git -C "$WT" rev-parse HEAD)

# Bare ref: the fixed point for a local three-dot diff (the same comparison as git diff <ref>...HEAD)
BASE=$(git merge-base <ref> HEAD); HEAD=$(git rev-parse HEAD)

# No argument: the current branch against the merge-base with the default branch
DEFAULT=$(git symbolic-ref --short refs/remotes/origin/HEAD)
BASE=$(git merge-base "$DEFAULT" HEAD); HEAD=$(git rev-parse HEAD)
PR=$(gh pr view --json number --jq .number 2>/dev/null || true)   # an open PR for this branch enables posting

# Every mode: both ends resolve and the diff is non-empty, or stop here
git rev-parse --verify "$BASE^{commit}" "$HEAD^{commit}"
git diff --name-only "$BASE" "$HEAD"
```

In PR mode, run every later git command in `$WT` (`git -C "$WT" …`) so the user's checkout stays untouched.

Done when `BASE` and `HEAD` both resolve, the file list is non-empty, and you have said in one line what you are comparing (`<base7>..<head7>`, N files). A bad ref or an empty diff stops here, before a sub-agent is spent on it.

### 2. Explore

Read `CONTEXT.md` and the ADRs whose scope touches the changed files first.

Then spawn a sub-agent to read the change. Its brief carries `BASE`, `HEAD`, the checkout path, the file list, the paths to `CONTEXT.md` and the relevant ADRs, the codebase-design glossary and principles pasted in (it has no other access to them), and the reading rule and four questions below, verbatim.

**A diff cannot show depth.** Depth is a property of the interface, and a diff shows fragments of interfaces. So the sub-agent reads wider than a reviewer, and bounded: for every touched module, the module whole (interface and implementation), its direct callers, and the tests that exercise it. Touched modules and their direct callers, not the codebase. (The review skills say "the diff is your view"; this skill deliberately reads more, and stops there.)

Four questions, asked of every touched module:

1. **Introduced shallowness.** Did the PR add a module whose interface is nearly as complex as its implementation, or a seam with one adapter and nothing varying across it? Apply the deletion test: would deleting the new module concentrate complexity back where it belongs, or was it earning its keep?
2. **Extracted for testability.** Did it pull pure functions out so they could be unit-tested, while the bugs live in how they are called? Tests with no locality pass while the call site is wrong.
3. **Touched an already-shallow module.** Was the module shallow before this PR? Pre-existing shallowness counts only where the PR touches it, and there it is the cheap moment: the author is already in the file and tests are being written.
4. **Tests past the interface.** Do the PR's tests cross the interface, or assert on internals and mock the code under test? A test that would break under an internal refactor is testing past the interface.

Each yes becomes a candidate carrying: the files (module and callers), the problem in the vocabulary, the deepening (what goes behind which interface, in a line or two: a direction, not a design), the payoff (locality or leverage gained, which tests get simpler or disappear), and two calls:

- **Timing**: `This PR` when the deepening lives inside the files the PR already rewrites and the PR's own tests become the tests at the new interface; `Follow-up` when it is real but spreads past the PR's files or would change its scope; `Leave it` when it is pre-existing and cheap to live with, or an ADR settles it. One line of reason.
- **Strength**: `Strong`, `Worth exploring`, or `Speculative`.

An ADR conflict is surfaced only when the friction is real enough to reopen the ADR, and is named on the card.

Done when every file in the diff has been read as part of its whole module, each of the four questions has an answer per touched module (a "no" is an answer), and every candidate carries both calls. Zero candidates is a valid result.

### 3. Report

Print the report in the terminal, in `CONTEXT.md` nouns for the domain and codebase-design terms for the architecture. Keep each card short; the deepening is a direction, not a design.

```markdown
## Deepening opportunities: <PR title or branch> (`<base7>..<head7>`)

Opportunities, not a verdict: nothing here blocks the merge.

### 1. <Candidate, named in CONTEXT.md nouns>
- **Files**: `src/orders/intake.ts`, `src/orders/validate.ts` (callers: `src/api/orders.ts`)
- **Problem**: <which question fired, in the vocabulary>
- **Deepening**: <before, in a line> → <after, in a line>
- **Payoff**: <locality or leverage gained; which tests get simpler or disappear>
- **Timing**: `This PR` | `Follow-up` | `Leave it`. <one-line reason>
- **Strength**: `Strong` | `Worth exploring` | `Speculative`
- **ADR**: <only when one is contradicted: "contradicts ADR-0007; worth reopening because …">

### 2. …

## Top recommendation
<which candidate first and why, or: none, the PR introduces no shallowness and touches no shallow module>
```

When `PR` is set, ask exactly one question: post this as a PR comment? Post only after an explicit yes (`gh pr comment "$PR" --body-file <report.md>`, with the file written to the OS temp dir, never the repo). Agreement with a candidate is not a yes. A no leaves the report in the conversation. When the input was a bare ref or the current branch with no PR, skip the question.

Done when the report has been shown and, for a PR, the posting question has been answered and acted on.

### 4. Grilling loop

Ask which candidate the user wants to explore; "none" ends the run. Once they pick one, call the Skill tool with "grilling" to walk the decision tree: constraints, dependencies, the shape of the deepened module, what sits behind the seam, which of the PR's tests survive at the new interface, and whether the timing call holds.

Side effects happen inline as decisions crystallise; call the Skill tool with "domain-modeling" to keep the domain model current. Writes go to the user's own checkout, never the throwaway worktree:

- Naming a deepened module after a concept not in `CONTEXT.md`? Add the term. Create the file lazily if it doesn't exist.
- Sharpening a fuzzy term during the conversation? Update `CONTEXT.md` right there.
- User rejects the candidate with a load-bearing reason? Offer an ADR: _"Want me to record this as an ADR so future architecture passes don't re-suggest it?"_ Only when a future explorer would need the reason; skip ephemeral ("not now") and self-evident ones.
- Want to explore alternative interfaces for the deepened module? Call the Skill tool with "codebase-design" and use its design-it-twice parallel sub-agent pattern.

The outcome is an idea: a `This PR` candidate goes back to whoever owns the branch; a `Follow-up` is the user's to file. Remove the throwaway worktree (`git worktree remove "$WT"`) when the run ends.

Done when the user has stopped, or the picked candidate has been grilled to a shape they accept or reject.

## Guardrails

- Opportunities, never a verdict. No "fix before merge", no approve, no request-changes. The merge is someone else's decision.
- Read-only on the branch. The only files this skill writes are `CONTEXT.md` and ADRs from the grilling loop, in the user's checkout.
- Post only after an explicit yes. No PR, nothing to post.
- Read touched modules and their direct callers, then stop. Pre-existing shallowness is surfaced only where the PR touches it; for the whole codebase, tell the user to run `/improve-codebase-architecture`.
