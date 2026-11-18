# Checking parallel fix pull requests against each other before they merge

spp does not coordinate the fix pull requests of one panel round with each other: each worker gets its own findings, each fix passes its own gate, and the next round's Composition pass is where a defect that exists only because two fixes met is found.

## Why it holds

The panel routes findings so that fixes rarely meet at all: a class of findings that spans Sub-issues goes whole to one worker, and its files leave every other worker's scope for the round (`skills/review-panel/ROUNDS.md` step 1). What still meets is read once, over the whole fix diff, by the Composition pass in step 2. Telling every worker what every other worker is changing would put the same check in each brief, before the fixes it is about exist.

A regression inside one fix is a different defect with a different home, the worker's fix round (`skills/implement-issue/FIX-ROUND.md`). In the round behind #421, seven of the eight Important findings were of that kind and one was a meeting of two fixes, and all of them were already counted under #418.

## Revisit when

Most of a round's `fix-regression` findings sit where two fix pull requests' changes meet, in more than one Epic, or meeting defects alone carry an Epic past the two-round cap to HUMAN DECISION.

## Asked by

- #421: "review-panel ROUNDS step 1: fix-regression (1 Signals, runs not recorded)"
