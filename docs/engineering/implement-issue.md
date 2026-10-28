## What it does

`implement-issue` builds one SDD sub-issue end to end: it checks the issue is ready, claims it with the `claimed` label, branches `sdd/<N>-<slug>`, drives the tests from the ticket's **Test scenarios**, runs the ticket's **Verify** block, records that run as a git note, reviews its own diff, and opens a PR with `Closes #N`. It keeps one progress comment on the issue current throughout. It never merges and never touches another ticket.

The worker reads the same laws the gate will cite: the documents on the **Laws line** of the repo's routing block (or, without one, the same fallback list [review-pr](../engineering/review-pr.md) and [review-panel](../engineering/review-panel.md) use), the epic's decisions, and every document the ticket cites. It checks a law at the moment the law's trigger comes up, and it cannot finish without writing a `## Laws` section in the PR body that makes one claim per law.

The ticket is the whole world. A worker running this skill sees the issue, the epic it belongs to and the repo's laws, never the conversation that produced them, which is why [to-tickets](../engineering/to-tickets.md)'s SDD pass makes every ticket carry Files owned, Interfaces and Verify.

## When to reach for it

Type `/implement-issue <N>`, or the agent reaches for it when it is handed an SDD sub-issue. In practice something else usually starts it:

| Started by | How |
| --- | --- |
| [build-epic](../engineering/build-epic.md) | each worker calls it for its ticket, inside its own worktree |
| [implement](../engineering/implement.md) | `/implement #N` hands off to it when the issue is an SDD sub-issue |
| You | `/implement-issue <N>` for a single ticket outside a wave |

For work that is not an SDD sub-issue (a spec, a plain ticket, the conversation), use [implement](../engineering/implement.md).

## Prerequisites

The issue must be open, unblocked, not held and labelled `ready-for-agent`. Held means it carries the `claimed` label or has an assignee, unless the progress comment's Worker line names this worker, which resumes. The skills-plus-plus plugin's Stop hook refuses to let the session finish on an `sdd/*` branch until the Verify run is recorded as a git note on `HEAD`.

## Common questions

**What does claimed mean?** The worker holds the ticket by adding the `claimed` label before any work starts, and clears it when it stops without a PR, through one `sync-progress` **hand-back** call that also routes the ticket and records why. The label stays through `pr-open`. A ticket with the label, or with any assignee, is held and not ready; the Worker line in the progress comment says who holds it, and a run that finds another worker named there stops and reports "held by <name>".

**What happens when the worker gets stuck?** It hands the ticket back in one call: `sync-progress.sh hand-back <issue> needs-info|ready-for-human|blocked --reason ...`. The call sets the route label, clears the `claimed` mark and writes the reason on the progress comment, so nothing is left half done. The worker then pushes what it committed and reports `BLOCKED` or `NEEDS_CONTEXT`.

**Why can't it stop?** The Stop hook is doing its job: the tree is dirty or there is no Verify note on `HEAD`. Run the Verify block and record it, or, if the ticket cannot be built, hand it back (`needs-info`, `ready-for-human` or `blocked`, with a reason) and record a `blocked` note instead.

**The ticket's Produces signature can't work. Does the worker stop?** Only for a contract another repo or the epic itself states (a route and its shapes, an event payload, a generated-client method): that is `NEEDS_CONTEXT`. An in-repo code signature (a function, type, enum or struct) may change as a declared **Interface deviation**: the worker ships the signature that works, writes an `Interfaces changed:` line in the PR body with the old signature, the new one and why the old one could not work, and reports `DONE_WITH_CONCERNS`. [review-pr](../engineering/review-pr.md) then judges whether the change was needed.

**Why does the PR body need a `## Laws` section?** Fix rounds on slice PRs kept citing laws the worker had been told to read but never checked against its diff. The section has no default text, so the worker has to look at each law to fill it: one line per law that applies, saying how the diff meets it, and one `n/a: <reason>` line for a source where nothing applies. [review-pr](../engineering/review-pr.md) reads each line as a claim to verify, so an `n/a` on a law the diff triggers is a finding, and a missing section is one too.

**Why check a law in the middle of the work instead of at the end?** A law such as "extract the shared copy before writing a second one" is cheap at the moment the second copy is about to be written and expensive once both copies exist. So a law that names its trigger (a second copy of some markup, a component going into a second host, a test asserting a button is shown) is checked right then, usually with a search, and acted on in the same PR. A law with no trigger waits for the self-review.

**What does test-first mean when the ticket only changes prose?** When the Files owned are a `SKILL.md`, a reference file or a docs page, the Test scenarios resolve to commands in the Verify block, so the Verify block is the test. The worker runs it before any edit and records which commands fail; that is RED. The edit that turns each one is GREEN, in scenario order. A command that already passes before the edit has no RED, so the worker lists it under Notes for the reviewer as `No RED: <command>` and the reviewer reads it as a weak pin. A ticket that also has a test file follows the normal [tdd](../engineering/tdd.md) loop for that file.

**Why does the self-review come before the PR opens?** So the reviewer reads a diff that has already been reviewed once and is no longer changing. The claims check is the one part that runs after the push, because it compares the report with what is on the remote branch.

**Why is it model-invoked when `implement` is not?** Workers have to start it without a human typing it. A user-invoked skill cannot be reached by another skill or agent at all.

**Which branch does it start from?** It works on `sdd/<N>-<slug>`, cut from the remote base the brief names (`origin/<base>`), never from whatever the worktree happened to be on, which is often the default branch. If the brief's first step already created that branch from that base, the worker stays on it.

## It's working if

- The PR says `Closes #N`, targets the integration branch named in the brief, and touches only Files owned (anything else is declared in the PR body).
- `git log origin/<integration branch>..HEAD` on the worker's branch lists only the ticket's own commits, none from the default branch.
- `git notes --ref=sdd-verify show HEAD` on the PR head says `verified`.
- The Verify SHA in the report equals the PR's head commit, and every test, file or pin the report or PR body names shows up in the PR's diff.
- The PR body carries a `Verify block corrected:` line, `no` or `yes` with what was wrong.
- On a prose-only PR, the TDD line says which Verify commands were red before the edit and names any that were not as `No RED: <command>` under Notes for the reviewer.
- The PR body has a `## Laws` section between `## Interfaces` and `## Notes for the reviewer`, with a line for each law that applies and an `n/a: <reason>` line for each source with nothing applying, never an empty slot.
- The `Interfaces changed:` line is filled in by hand: `none` only when every public symbol the diff adds, removes or re-signs matches a Produces line on the ticket, otherwise one line per deviation.
- The issue has exactly one `<!-- sdd-progress -->` comment, rewritten as the work moves.

## Where it fits

`implement-issue` is the **worker step** under [build-epic](../engineering/build-epic.md). Its output goes straight to [review-pr](../engineering/review-pr.md). [ask-syn54x](../engineering/ask-syn54x.md) routes the whole set.
