# Scoped re-review

A fix round answers specific findings, so the second look is aimed at them and at the commits that answered them. Reading the whole pull request again would find new taste-level points every round and the round would never end.

## Steps

1. **Find the earlier round.** Read this skill's last review comment on the pull request (`gh pr view "$PR" --json reviews`) and the head it was given on: the `<!-- spp-verdict -->` marker's head, or with no marker the sha on that comment's `Verify:` line. That head is `OLD`; the current `headRefOid` is `HEAD`. Number the earlier Critical and Important findings F1, F2 and on, in the order they appear, Ponytail comment included, except a Ponytail line marked `overlaps`: it repeats a finding already numbered, so it gets no id of its own.
2. **Read the fix diff.** `git diff "$OLD" "$HEAD"`. It is the whole scope.
3. **Run the evidence again**, as step 3 of `SKILL.md` says: Verify on `HEAD`, a trial merge when the base has moved past `HEAD`'s merge base, and `spp checks`. Ponytail does not run again.
4. **Judge each earlier finding.** Addressed means the defect is gone at `HEAD`, shown by a line or a test; a change that tries and leaves the failure in place is not addressed.
5. **Look for breakage in the fix diff.** A new Critical or Important defect the fix introduced is a finding in the usual shape, with its Law tag. Anything else you spot, in the fix or beyond it, is listed as `Out of scope:` and blocks nothing.

## The comment

```markdown
## Spec: PASS | FAIL
- ADDRESSED F1 · <file:line>

## Quality: PASS | FAIL
- NOT ADDRESSED F2 · <file:line> · <what still fails>
- <new findings from the fix diff, in the usual shape>

Out of scope: <observations | none>

Verify: ...
Trial merge: ...
Checks: ...
```

Each earlier finding sits under the verdict it first appeared in. A verdict fails while any finding under it is not addressed or a new Critical or Important finding stands. The `ADDRESSED` lines carry no Law tag: the finding they answer already has one. Record the verdicts for `HEAD` and post as step 7 of `SKILL.md` says.
