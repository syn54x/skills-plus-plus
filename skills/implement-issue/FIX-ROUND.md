# Fix round

You are resumed with a gate's findings on work you built. The claim, the branch and the base from step 3 are already yours. Fixing one finding at a time, each at the line it names, is how a fix breaks the code beside it and hands the next review a new finding. So plan every finding before the first edit.

## 1. Plan

Read each finding, the code around the line it names and any Law it cites. Then write one plan entry per finding:

- **Cause.** The root cause, which is often not the named line. Findings that share a cause become one entry.
- **Reach.** Every caller, test, fixture and doc the change touches. Search for each name the fix changes; do not trust memory. A caller that relies on the current behaviour is part of the fix, not a side effect of it.
- **Overlap.** Any other entry whose reach shares a file or a caller with this one. Plan those as one change, in an order you state.
- **Guard.** The test that fails now and will pass after the fix, plus the test that would catch a regression in the reach. When the reach has no such test, the plan adds one.

A finding you judge wrong gets no fix: its entry says why, and the gate decides.

Done when every finding has an entry with all four lines, and no two entries edit the same lines unless they are one change.

## 2. Fix

Run step 4 of `SKILL.md`. Each Guard is a Test scenario, taken in the plan's order and red first. Stay inside Files owned and whatever files the round's brief hands you. Before step 5, rerun the test files for everything in every Reach, not only the files the findings named.

## 3. Finish

Steps 5 to 9 as usual, with two differences:

- The pull request gets a `## Fix plan` section with one line per entry: the finding ids, the cause, the reach and the guard test (`file::name`). On a slice's fix round the pull request already exists, so push to its branch and edit its body to add the section. A fix pull request into the Epic's integration branch is new, so its body carries the section from the start.
- The report's `notes` names each finding id with its guard test, and each finding you left unfixed, with the reason.
