# Fix rounds

A FIX FIRST verdict sends the Critical and Important findings back to be fixed, then looks again. The panel allows two fix rounds. After the second, the decision passes to the person.

## 1. Route the findings

Group the Critical and Important findings by **class**: findings that break the same rule, or fail the same way in different files, are one class (the Law tag or the title is the usual key). Then give each finding an owner from the Sub-issues' `## Files owned` in `spec.md`.

- A class whose files all sit inside one Sub-issue goes to that Sub-issue's worker.
- A class that spans Sub-issues goes whole to the worker whose Sub-issue owns the most of its files (a tie goes to the lower-numbered one), and those files leave every other worker's scope for the round. Its brief names every finding id and file in the class.
- A file no Sub-issue owns goes to the person with the report.

Each worker gets only its findings, with ids, files and the fix when the report gives one, and plans them together before it edits. Minor findings wait for the person. `build` starts the workers; the panel does not edit code. Wait until the round's fixes are merged into the Epic's pull request and `HEAD` has moved.

Done when every Critical and Important finding has one owner and the fixes sit on the new head.

## 2. Look again

`LAST` is the head the previous round reviewed and `NEW` is the head now. Start the round's own folder first, so nothing an earlier round wrote reaches this round's merge:

```bash
R=2   # 2 after the first fix round, 3 after the second
ROUND_DIR="$PANEL_DIR/round-$R"; rm -rf "$ROUND_DIR"; mkdir -p "$ROUND_DIR"
```

Save the round's combined fix diff to `$PANEL_DIR/fix-$R.patch` with `git diff -U8 "$LAST" "$NEW"`, rewrite `context.md` so the Personas' view is that patch and its head is `NEW`, and run steps 3 to 6 of `SKILL.md` on `NEW` in this shape:

1. **Each earlier finding.** One Persona, the one that raised it or `correctness`, answers `ADDRESSED` or `NOT ADDRESSED` for every open Critical and Important id against the fix diff, with a line or a test as evidence. A change that tries and leaves the failure in place is not addressed. Its reply also reports each `NOT ADDRESSED` finding again, at its original severity and in the findings JSON shape, its name in the `persona` field. The Persona only replies: you write each recheck reply into `$ROUND_DIR/recheck-<name>.json`, one file per Persona that rechecks, the same way step 5 of `SKILL.md` writes `persona-<name>.json`, before the merge below, so it joins that merge and counts toward the verdict. The `recheck-` prefix keeps it apart from the Composition pass's `persona-<name>.json` when both are the same Persona, `correctness` most often.
2. **Spec and Coherence again.** `SKILL.md` step 3 on `NEW`, with the same request, then Verify and `spp checks`, read again.
3. **The Composition pass.** The always-on Personas, plus each conditional Persona the fix diff touches (one it does not touch is dropped, even if round one ran it), run once over the whole fix diff, never slice by slice, each reply written to `$ROUND_DIR/persona-<name>.json`. This is where defects appear that exist only because two fixes met.

Merge as before, over `$ROUND_DIR` only and with `--fix-diff "$PANEL_DIR/fix-$R.patch"` added (a finding on a line the fixes changed is recorded as a `fix-regression` Signal), and write the report in the later-round shape from `VERDICT.md`. The merge command takes the round as its `--verdict` value, so the same rule runs over what is still open: each `NOT ADDRESSED` finding, each new one, and the re-run Spec, Coherence, Verify and checks. A dropped Persona's earlier reply stays in its own round's folder and never counts again. Record the round with `spp wave "$EPIC" panel --round "$R"` as `SKILL.md` step 6 says.

Done when the round's write-up is shown and recorded.

## 3. The cap

Round 3 is the last. When its verdict would be FIX FIRST (a Critical or a Spec FAIL still open, Verify red, or a check failing), the merge command already prints HUMAN DECISION; hand the person every open finding. A third fix round never starts by itself.

The person may still decide to fix. When they name the findings to fix, or ask for another round, run one **overtime** round: route as in step 1, look again as in step 2, number it on (Round 4, Round 5) and record it the same way. An overtime round's FIX FIRST also prints as HUMAN DECISION, so every round past the cap is one decision the person made.

HUMAN DECISION and MERGE hand the report to the person. Minor `depth` findings, candidate ADRs and terminology drift go to `/close-epic`'s Learnings.
