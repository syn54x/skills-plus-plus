# Record an escaped defect

A bug that got past spp's review gate is a Signal against that gate. This trace runs after step 4 has applied the role, and it never changes the role or the issue comment.

1. Trace only a bug that was reproduced and left as `ready-for-agent`, `ready-for-human` or the Epic path. `needs-info`, `wontfix` and `needs-triage` record nothing. Stop here for those.
2. The suspect lines are the lines on the default branch where your account of the code (step 2's "Is it true?" and step 3's short account) says the bug lives. When you could not narrow the fault to lines in a file, record nothing and say so. For each suspect range, run:

   ```bash
   git blame -w --porcelain -L <start>,<end> <default-branch> -- <file>
   ```

3. For each distinct commit it names, list the merged pull requests that carry it:

   ```bash
   gh api repos/<owner>/<repo>/commits/<sha>/pulls --jq '.[] | select(.merged_at != null) | .number'
   ```

   A commit with no merged pull request (a direct push, or an unmerged branch) was never gated: nothing is recorded for it, and you tell the person nothing gated those lines.
4. For each such pull request, read its comments with `gh pr view <pr> --json comments`. Keep a comment only when its first line starts `<!-- spp-verdict -->` and its author is the current gh user or its `authorAssociation` is `OWNER`, `MEMBER` or `COLLABORATOR` (the rule of ADR 0009). Pass over every other verdict comment, so a stranger's comment never charges the gate. A pull request with no kept comment was not gated: record nothing for it.
5. Read the gate's version from the kept comment's data trailer, its last `<!-- sdd-data: <base64> -->` line, decoded from base64 to JSON (for example `--jq` with `@base64d`). When the JSON holds `by` as an object with a string `version`, pass `--maker-version <by.version>`. When the trailer has no `by` (a verdict written before the trailer named its maker) or will not decode, leave the flag out, and the Signal takes the current version.
6. Record one Signal per gated pull request, never two for the same one, even when several suspect ranges blame to it. Put the evidence in single quotes and write each `'` in it as `'\''`, so backticks and `$` run nothing:

   ```bash
   spp signal escaped-defect --by "review" --maker-version <by.version> --evidence '#<bug>: <file>:<start>-<end> came from #<pr>, which passed the review gate'
   ```

   `spp signal` decides whether anything is recorded (CI, an Attended session, Self-improvement mode). Tell the person the one line it printed, `recorded ...` or `not recorded: <reason>`, and carry on. Put nothing about the Signal in the issue comment.
7. When a `git blame` or `gh api` call fails (no history, no remote, a shallow clone), record nothing for it, say which call failed, and continue with the rest of step 4.
