# The verdict and the panel's write-up

One write-up per round. Every part is read off the inputs, so the same merge output, the same Spec and Coherence sections and the same evidence give the same text.

## The verdict

Read the first row that holds; do not weigh the rest.

| Verdict | When |
| --- | --- |
| FIX FIRST | Spec FAIL, Coherence FAIL, Verify failed, a check failing on the head, a Persona that did not report, or at least one `critical` finding. |
| HUMAN DECISION | No row above holds, and there is at least one `important` finding, a check still pending, or a `ticket-mandated` finding for a person to settle. |
| MERGE | None of the above. No checks configured changes nothing. |

The one sentence under the verdict names the first thing that decided it: `F3 is critical`, `Verify failed on a1b2c3d`, `2 important findings and no critical one`. A Spec FAIL is never softened by a clean panel.

## Layout

Write the sections in this order.

```markdown
## Verdict: MERGE | FIX FIRST | HUMAN DECISION
<one sentence>

## Spec: PASS | FAIL
<the review skill's Spec findings, verbatim>

## Coherence: PASS | FAIL
<the review skill's Coherence findings, verbatim>

## Findings
### Critical
- F1 `correctness`+`adversarial` · `src/invoice.ts:88` @ `<sha7>` · <title> · [<Law tag>]
  <the body from the merge output>
### Important
### Minor

## Coverage
Personas: <names>, with the reason for each non-default one. Dropped for the cap of nine: <names | none>.
Did not report: <names | none>. Dropped below confidence 80: <n>.
Spec source: <Epic #N | the pull request body>.
Verify: passed | failed on `<sha7>` (`<command>`).
Checks: <n> pass, <n> fail (<names>), <n> pending on `<sha7>` | none configured

## Residual risk
<what a person should watch after the merge: rollout, data, monitoring, or "none identified">
```

- Findings come from the merge output as printed, with the ids it assigned. Quote an id as `F1`, never `#1`, which GitHub turns into a link to an issue or pull request.
- `### Critical`, `### Important` and `### Minor` keep the merge order. An empty section is left out.
- A finding whose title begins `Candidate ADR:` or `Terminology`, and any `depth` finding at `minor`, is also copied under Residual risk as a pointer for `/close-epic`'s Learnings.
- Residual risk draws only on what the Personas reported (a `Check after deploy:` finding, a rollout note in a body), never on a guess.

## A later round

The heading carries the round, `## Verdict: FIX FIRST · Round 2`. After the verdict, add an **Earlier findings** table with every id still open from any earlier round, then the sections above with **New findings** in place of Findings. The merge numbers a round's findings from `F1` again, so a later round writes them with the round in front (`R2-F1`, `R3-F2`) and the ids of earlier rounds never collide. Coverage adds `Fix diff: <LAST sha7>..<NEW sha7>, <n> files`. Post a later round as a new comment; an earlier write-up is never edited.

```markdown
## Earlier findings
| Id | Status | Evidence |
| --- | --- | --- |
| F1 | ADDRESSED | `src/invoice.ts:88` @ `<sha7>` |
```
