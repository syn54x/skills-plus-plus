# The Epic's pull request

The pull request that takes an Epic's integration branch to its base gets one spec verdict covering everything the branch changed, judged against the Epic. Quality and the Depth check are left to the panel's Personas, which `review-panel` runs on the same pull request; for an Epic too small for the panel, this spec verdict is the whole main gate.

## Steps

1. **Read the plan.** The Epic body, and its plan comment's `**Narrowed:**` and `**Deviated:**` lines. A narrowing is scope a person approved; a deviation is an accepted new signature that producer and consumers are both judged against.
2. **Run the evidence** as items 1 to 3 of step 3 in `SKILL.md` say, with the Epic's Sub-issues standing in for the linked issue: run each closed Sub-issue's Verify block on `HEAD`, then read `spp checks`. Ponytail does not run here; it sits beside slice gates only. A block that passed on its slice and fails here is Critical: two slices broke each other on the way in.
3. **Spec.** Every user story and Implementation Decision is delivered, or narrowed. A shortfall anywhere else is Missing, even when the Sub-issue that should have carried it passed its own gate. Out of Scope stays untouched. Tag each finding `[epic#<decision or section>]`.
4. **Coherence.** Wherever two Sub-issues met (one produced what another consumed), check that they agree at `HEAD`: names, shapes, failure behaviour. In a multi-repo Epic, check each contract that crosses repos against what the other repo's integration branch holds now: nowhere earlier do both sides exist together.

## The comment

```markdown
## Spec: PASS | FAIL
- <findings>
Cannot verify: <items | none>

## Coherence: PASS | FAIL
- <findings>

Verify: <n> Sub-issue blocks on `<sha7>`: passed | failed (`<command>`)
Checks: <reading from spp checks>
```

No verdict marker is written here: the panel's report, or the person who merges, owns this pull request's outcome. Post as step 7 of `SKILL.md` says and return the two verdict lines.
