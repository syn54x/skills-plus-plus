## What it does

`improve-pr-architecture` reads one pull request through the deep-module lens and hands you **deepening opportunities**: places where the diff introduced a shallow module, tested past an interface, or brushed against a module that was already shallow and could be deepened cheaply while the author is still in the file. It is the same survey [improve-codebase-architecture](../engineering/improve-codebase-architecture.md) runs over a whole codebase, narrowed to the modules a diff touches.

It never gates. Every candidate carries a timing call (`This PR`, `Follow-up`, or `Leave it`) and a strength badge, and none of them is a verdict on the merge. The report prints in the terminal as markdown; if there is a pull request behind the diff, the skill asks once whether to post it as a comment and posts nothing until you say yes. The branch itself is never edited.

## When to reach for it

You invoke this by typing `/improve-pr-architecture`, and the agent won't reach for it on its own. It takes a PR number, a PR URL, a git ref to diff against, or nothing (the current branch against the default branch).

| Your situation | Reach for |
| --- | --- |
| Your own PR, before you ask for review: did I just add a shallow module? | `improve-pr-architecture` |
| A PR you are reviewing, and the shape bothers you more than the logic | `improve-pr-architecture` |
| A merged PR you suspect left a follow-up behind | `improve-pr-architecture <ref>` against the commit before it |
| The whole codebase has drifted, not one diff | [improve-codebase-architecture](../engineering/improve-codebase-architecture.md) |
| Is this PR correct, on spec, and up to the repo's standards? | [code-review](../engineering/code-review.md), or [review-panel](../engineering/review-panel.md) for a PR to main |
| You have already chosen the module and want to design it | [codebase-design](../engineering/codebase-design.md) |

## Prerequisites

The PR modes need the `gh` CLI signed in; a bare ref or the current branch needs only git. It reads `CONTEXT.md` and `docs/adr/` when they exist and names candidates in your domain's nouns when they do.

It writes in two places, both outside the branch under review. A PR comment goes up only after you say yes. During the grilling loop it adds or sharpens terms in your checkout's `CONTEXT.md`, creating the file if needed, and offers to record a rejected candidate as an ADR so a later run does not re-suggest it.

## A diff cannot show depth

Depth is a property of a module's **interface**: how much behaviour a caller gets per unit of interface they have to learn. A diff shows fragments of interfaces, so the review skills' rule ("the diff is your view") would make this skill blind. Instead it reads wider, and bounded: every touched module whole, its direct callers, and the tests that exercise it. Touched modules and their callers, never the codebase.

Against that reading it asks four questions of every touched module:

- **Introduced shallowness.** Did the PR add a module whose interface is nearly as complex as its implementation, or a seam with one adapter and nothing varying across it? The deletion test decides: would removing it concentrate complexity, or was it earning its keep?
- **Extracted for testability.** Did it pull pure functions out to unit-test them while the bugs live in how they are called? Those tests pass while the call site is wrong.
- **Touched an already-shallow module.** Pre-existing shallowness counts only where the PR touches it, and there it is the cheap moment: the author is in the file and tests are being written.
- **Tests past the interface.** Do the PR's tests cross the interface, or assert on internals and mock the code under test?

Each yes becomes a card: files, the problem in the deep-module vocabulary, the deepening as a direction rather than a design, the payoff in **locality** and **leverage**, and two calls.

| Timing | What it means |
| --- | --- |
| `This PR` | The deepening lives inside the files the PR already rewrites, and the PR's own tests become the tests at the new interface. |
| `Follow-up` | Real, but it spreads past the PR's files or would change its scope. Yours to file. |
| `Leave it` | Pre-existing and cheap to live with, or an ADR settles it. Recorded so the next run does not re-raise it. |

| Strength | What it means |
| --- | --- |
| `Strong` | The deletion test passes clearly and the friction is real. |
| `Worth exploring` | Plausible, but the payoff depends on where the code goes next. |
| `Speculative` | Surfaced for completeness. A report of nothing but these is the skill saying it found nothing. |

The report ends with a top recommendation, then the skill asks which candidate you want to explore. Picking one starts a [grilling](../productivity/grilling.md) session over it, the same loop the whole-codebase sibling runs: constraints, what sits behind the seam, which of the PR's tests survive, and whether the timing call holds.

## Common questions

**Why is this not a persona in `review-panel`?**

Because the panel produces findings and this produces opportunities. A panel persona has to anchor every finding to a line, clear a confidence gate, rank it Critical, Important or Minor, and drop anything that is an opinion without a documented rule or a smell behind it. "This new module's interface is nearly as wide as its implementation" is exactly that kind of opinion, rated `Worth exploring` rather than proven. Forcing it through the panel's schema would either silence it or inflate it into a blocker. Keeping it a separate `improve-` skill keeps the line clean: `review-` skills gate, `improve-` skills generate ideas.

**Does it block the merge?**

No, by construction. It never approves, never requests changes, and the comment it offers to post is a list of opportunities that says so in its first line. The merge decision belongs to whoever owns it. If you want a verdict on the same diff, run [code-review](../engineering/code-review.md).

**Can I skip the grilling and just get the report?**

Say so when you invoke it ("just the report"). The report comes first and the grill only starts on a candidate you pick, so "none" at that prompt ends the run. The whole-codebase sibling has a long-standing complaint about grilling too early on one idea, and the fix here is the same: the interview never starts until you have chosen something.

**It found six candidates. Same session or a new one?**

One candidate per session, as with the sibling. Grill the one you pick, take the decision into [to-spec](../engineering/to-spec.md) if it is a `Follow-up`, and leave the rest on the PR comment or in your notes. A `This PR` candidate goes back to whoever owns the branch; the skill does not make the change itself.

**How is this different from the smells `code-review` already flags?**

`code-review`'s Standards axis and `review-panel`'s maintainability persona run the Fowler smells, and a few of them (Middle Man, Speculative Generality, Shotgun Surgery) brush against shallowness from the outside. This skill's lens is narrower: interface complexity against implementation complexity, where the seam sits, and whether the tests have locality. Something that is only a smell belongs to those skills, and this one says so rather than reporting it twice.

## It's working if

- Candidates are named in your `CONTEXT.md` nouns, not in class names the diff happens to use.
- Every card carries both a timing call and a strength badge, and the report ends with a top recommendation.
- Nothing on the branch changed. The only writes are `CONTEXT.md` and ADRs in your own checkout, during the grill.
- It asked before posting, and a no left the report in the conversation.
- A run against a bare ref never touched GitHub at all.
- A candidate the sub-agent could only see from the diff was not reported; every card names the module and its callers.

## Where it fits

`improve-pr-architecture` is a **reach-for-it-anytime standalone**, best run on your own PR before asking for review or on someone else's while you review it. Its neighbours are [improve-codebase-architecture](../engineering/improve-codebase-architecture.md), the periodic whole-codebase survey this narrows, [codebase-design](../engineering/codebase-design.md), which owns the vocabulary every candidate is written in and is the bench you design the chosen one on, and [code-review](../engineering/code-review.md), which gates the same diff on standards and spec while this one never gates. What it produces is an idea, which re-enters the main flow at [grill-with-docs](../engineering/grill-with-docs.md) or [to-spec](../engineering/to-spec.md). For which skill fits a situation, [ask-syn54x](../engineering/ask-syn54x.md) is the router over the whole set.
